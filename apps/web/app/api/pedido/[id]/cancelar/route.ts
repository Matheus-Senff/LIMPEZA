import { NextResponse } from 'next/server';
import { clienteComToken, clienteServico, tokenDaRequisicao } from '@/lib/supabase';
import { stripeConfigurado, estornarPagamentoPedido, expirarSessaoCheckout } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Cancelamento do cliente. A RPC continua sendo quem decide se pode
 * cancelar e qual a taxa — aqui só entra o passo que a RPC não pode fazer
 * sozinha (não fala com a internet): estornar na Stripe o que já foi pago.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const motivo = typeof body?.motivo === 'string' ? body.motivo : null;

  const token = tokenDaRequisicao(req);
  const cliente = token ? clienteComToken(token) : null;
  if (!cliente) return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 });

  const { data: cancelado } = await cliente.rpc('fn_cancelar_pedido', { p_order_id: id, p_motivo: motivo });
  if (!cancelado) {
    return NextResponse.json({ erro: 'nao_cancelavel' }, { status: 409 });
  }

  const servico = clienteServico();
  if (!stripeConfigurado || !servico) {
    return NextResponse.json({ cancelado: true });
  }

  const { data: pedido } = await servico
    .from('orders')
    .select('price_cents, cancellation_fee_cents, stripe_checkout_session_id')
    .eq('id', id)
    .maybeSingle();

  if (!pedido) return NextResponse.json({ cancelado: true });

  // Se ainda tinha um checkout em aberto (pedido cancelado antes de pagar,
  // ou o profissional/cliente desistiu com uma aba antiga aberta), fecha
  // essa porta — melhor esforço, não bloqueia o cancelamento se falhar.
  await expirarSessaoCheckout(pedido.stripe_checkout_session_id);

  const { reembolsado, erro } = await estornarPagamentoPedido(
    servico,
    id,
    pedido.price_cents - pedido.cancellation_fee_cents,
  );

  return NextResponse.json({ cancelado: true, reembolsado, reembolso_erro: erro ?? null });
}
