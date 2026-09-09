import { NextResponse } from 'next/server';
import { clienteComToken, clienteServico, tokenDaRequisicao } from '@/lib/supabase';
import { stripeConfigurado, criarSessaoCheckout, expirarSessaoCheckout } from '@/lib/stripe';
import { buscarPorCodigo } from '@/lib/catalogoDb';

export const runtime = 'nodejs';

/**
 * Checkout abandonado (cliente fechou a aba, sessão expirou sozinha depois
 * de 24h) não precisa virar "cancela e refaz o pedido em Serviços" — gera
 * uma cobrança nova pro MESMO pedido, sem perder endereço/horário/preço já
 * fechados. Só funciona enquanto o pedido ainda está pending_payment; uma
 * vez pago ou cancelado, o caminho é outro.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!stripeConfigurado) {
    return NextResponse.json({ erro: 'pagamento_nao_configurado' }, { status: 409 });
  }

  const token = tokenDaRequisicao(req);
  const cliente = token ? clienteComToken(token) : null;
  if (!cliente) return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 });

  const {
    data: { user },
  } = await cliente.auth.getUser(token!);
  if (!user) return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 });

  const { data: pedido } = await cliente
    .from('orders')
    .select('id, status, service, price_cents, stripe_checkout_session_id')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (!pedido) return NextResponse.json({ erro: 'pedido_nao_encontrado' }, { status: 404 });
  if (pedido.status !== 'pending_payment') {
    return NextResponse.json({ erro: 'pedido_nao_esta_aguardando_pagamento' }, { status: 409 });
  }

  await expirarSessaoCheckout(pedido.stripe_checkout_session_id);

  const origem = new URL(req.url).origin;
  const servicoInfo = await buscarPorCodigo(pedido.service);

  try {
    const sessao = await criarSessaoCheckout({
      origem,
      orderId: pedido.id,
      priceCents: pedido.price_cents,
      nomeServico: servicoInfo?.nome ?? pedido.service,
      customerEmail: user.email ?? undefined,
      metodo: 'credit_card',
    });

    if (!sessao.url) throw new Error('sessão sem url de checkout');

    const servicoRole = clienteServico();
    if (servicoRole) {
      await servicoRole.from('orders').update({ stripe_checkout_session_id: sessao.id }).eq('id', pedido.id);
    }

    return NextResponse.json({ checkoutUrl: sessao.url });
  } catch (e) {
    return NextResponse.json(
      { erro: 'falha_pagamento', mensagem: 'Não foi possível gerar uma nova cobrança agora.', detalhe: (e as Error).message },
      { status: 502 },
    );
  }
}
