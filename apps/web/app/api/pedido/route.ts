import { NextResponse } from 'next/server';
import { clienteComToken, clienteServico, tokenDaRequisicao } from '@/lib/supabase';
import { partesDaData } from '@/lib/data';
import { stripe, stripeConfigurado, criarSessaoCheckout } from '@/lib/stripe';
import { buscarPorCodigo } from '@/lib/catalogoDb';

export const runtime = 'nodejs';

/**
 * Passo 6: fecha o pedido a partir de uma cotação válida.
 *
 * O preço usado aqui vem da cotação assinada gravada em `quotes` (nunca do
 * corpo da requisição) — o valor mostrado na tela é o valor cobrado.
 *
 * Com a Stripe configurada, o pedido nasce como 'pending_payment' e só vira
 * visível pros profissionais depois que o webhook confirma o pagamento —
 * ninguém recebe oferta de um pedido que ninguém pagou. Sem a chave
 * configurada (ambiente de teste/local), cai no fluxo simulado antigo:
 * pedido nasce já buscando profissional, sem cobrança nenhuma.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: 'json_invalido' }, { status: 400 });

  const metodo = body.metodo === 'credit_card' ? 'credit_card' : 'pix';
  const codigo = Math.random().toString(36).slice(2, 10).toUpperCase();
  const token = tokenDaRequisicao(req);
  const cliente = token ? clienteComToken(token) : null;

  if (!cliente || !body.quoteId) {
    // Sem sessão autenticada ou sem banco configurado: devolve um pedido
    // consistente sem gravar nada, para o funil continuar funcionando.
    return NextResponse.json({
      codigo,
      status: 'searching_professional',
      metodo,
      simulado: true,
    });
  }

  const {
    data: { user },
  } = await cliente.auth.getUser(token!);
  if (!user) {
    return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 });
  }

  const { data: cotacao } = await cliente
    .from('quotes')
    .select(
      'id, customer_id, zipcode, service, frequency, minutes, addons, scheduled_at, price_cents, payout_cents, expires_at, consumed_at',
    )
    .eq('id', body.quoteId)
    .maybeSingle();

  if (!cotacao) {
    return NextResponse.json({ erro: 'cotacao_nao_encontrada' }, { status: 404 });
  }
  // A cotação é o documento que fixa o preço: ela precisa ser desta pessoa,
  // senão dava pra fechar pedido com o valor cotado por outra.
  if (cotacao.customer_id && cotacao.customer_id !== user.id) {
    return NextResponse.json({ erro: 'cotacao_de_outro_cliente' }, { status: 403 });
  }
  if (cotacao.consumed_at) {
    return NextResponse.json({ erro: 'cotacao_ja_usada' }, { status: 410 });
  }
  if (new Date(cotacao.expires_at) < new Date()) {
    return NextResponse.json(
      { erro: 'cotacao_expirada', mensagem: 'Sua cotação expirou. Recalculamos o preço para você.' },
      { status: 410 },
    );
  }
  if (!cotacao.scheduled_at) {
    return NextResponse.json({ erro: 'sem_horario' }, { status: 422 });
  }

  // O endereço é sempre um já salvo no perfil — o funil não deixa mais
  // digitar rua/número/complemento na hora do pedido (evita duplicar
  // endereço em "endereços salvos" a cada pedido feito).
  const endereco = body.endereco ?? {};
  const enderecoId = typeof body.enderecoId === 'string' ? body.enderecoId : null;
  if (!enderecoId) {
    return NextResponse.json({ erro: 'sem_endereco', mensagem: 'Escolha um endereço salvo para o serviço.' }, { status: 422 });
  }

  const { data: enderecoSalvo, error: erroEndereco } = await cliente
    .from('addresses')
    .select('id, zipcode')
    .eq('id', enderecoId)
    .eq('customer_id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (erroEndereco || !enderecoSalvo) {
    return NextResponse.json({ erro: 'endereco_invalido', mensagem: 'Esse endereço não foi encontrado.' }, { status: 422 });
  }

  // Preço é calculado por região: o endereço do serviço tem que ser o mesmo
  // CEP que gerou a cotação.
  if (cotacao.zipcode && enderecoSalvo.zipcode !== cotacao.zipcode) {
    return NextResponse.json(
      {
        erro: 'cep_divergente',
        mensagem: 'O endereço do serviço mudou de CEP. Refaça a cotação para esse endereço.',
      },
      { status: 422 },
    );
  }

  // Garantia de segurança: `customers` não aceita mais insert/update direto do
  // cliente (só assim `credit_cents` fica fora do alcance do próprio usuário).
  await cliente.rpc('fn_registrar_cliente');

  // Tipo de lar/cômodos/instrução de acesso são específicos deste pedido —
  // atualiza no próprio endereço salvo (mesmo padrão de fn_editar_pedido).
  await cliente
    .from('addresses')
    .update({
      home_type: endereco.homeType ?? 'APARTMENT',
      bedrooms: Number(endereco.bedrooms ?? 2),
      bathrooms: Number(endereco.bathrooms ?? 1),
      access_notes: endereco.acesso || null,
    })
    .eq('id', enderecoId);

  const { data: pedidoSalvo, error: erroPedido } = await cliente
    .from('orders')
    .insert({
      customer_id: user.id,
      address_id: enderecoSalvo.id,
      quote_id: cotacao.id,
      service: cotacao.service,
      frequency: cotacao.frequency,
      minutes: cotacao.minutes,
      addons: cotacao.addons,
      scheduled_at: cotacao.scheduled_at,
      status: stripeConfigurado ? 'pending_payment' : 'searching_professional',
      price_cents: cotacao.price_cents,
      payout_cents: cotacao.payout_cents,
    })
    .select('id, code')
    .single();

  if (erroPedido || !pedidoSalvo) {
    return NextResponse.json({ erro: 'falha_pedido', mensagem: erroPedido?.message }, { status: 422 });
  }

  if (stripeConfigurado && stripe) {
    // A assinatura (se houver) e o broadcast de ofertas só acontecem depois
    // que o webhook confirmar o pagamento — ver /api/webhooks/stripe.
    const origem = new URL(req.url).origin;
    const servico = await buscarPorCodigo(cotacao.service);
    const { data: clienteExistente } = await cliente
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();
    try {
      const sessao = await criarSessaoCheckout({
        origem,
        orderId: pedidoSalvo.id,
        priceCents: cotacao.price_cents,
        nomeServico: servico?.nome ?? cotacao.service,
        customerEmail: user.email ?? undefined,
        metodo,
        stripeCustomerId: clienteExistente?.stripe_customer_id,
      });

      if (!sessao.url) throw new Error('sessão sem url de checkout');

      const servicoRole = clienteServico();
      if (servicoRole) {
        await servicoRole.from('orders').update({ stripe_checkout_session_id: sessao.id }).eq('id', pedidoSalvo.id);
      }

      return NextResponse.json({
        codigo: pedidoSalvo.code,
        status: 'pending_payment',
        metodo,
        checkoutUrl: sessao.url,
      });
    } catch (e) {
      // O pedido fica como 'pending_payment' — não é um beco sem saída: o
      // cliente vê "Aguardando pagamento" em Meus pedidos e pode cancelar.
      return NextResponse.json(
        {
          erro: 'falha_pagamento',
          mensagem:
            metodo === 'pix'
              ? 'Não foi possível gerar a cobrança via Pix agora. Tente pagar com cartão.'
              : 'Não foi possível iniciar o pagamento agora. Tente novamente em instantes.',
          detalhe: (e as Error).message,
        },
        { status: 502 },
      );
    }
  }

  // Fluxo simulado (sem Stripe configurada): mantém o comportamento antigo
  // pra ambiente de teste/local continuar funcionando sem chave nenhuma.
  if (cotacao.frequency !== 'SINGLE') {
    const { weekday, windowStart, startDate } = partesDaData(cotacao.scheduled_at);
    const assistencia =
      cotacao.frequency === 'WEEKLY' ? 'complete' : cotacao.frequency === 'BIWEEKLY' ? 'basic' : 'standard';
    const passoDias = cotacao.frequency === 'WEEKLY' ? 7 : cotacao.frequency === 'BIWEEKLY' ? 14 : 30;
    const proximaData = new Date(`${startDate}T00:00:00Z`);
    proximaData.setUTCDate(proximaData.getUTCDate() + passoDias);

    const { data: assinatura } = await cliente
      .from('subscriptions')
      .insert({
        customer_id: user.id,
        address_id: enderecoSalvo.id,
        service: cotacao.service,
        frequency: cotacao.frequency,
        minutes: cotacao.minutes,
        addons: cotacao.addons,
        weekday,
        window_start: windowStart,
        assistance_level: assistencia,
        start_date: startDate,
        next_run_date: proximaData.toISOString().slice(0, 10),
      })
      .select('id')
      .single();

    if (assinatura) {
      await cliente.from('orders').update({ subscription_id: assinatura.id }).eq('id', pedidoSalvo.id);
    }
  }

  await cliente.rpc('fn_gerar_ofertas', { p_order_id: pedidoSalvo.id });

  return NextResponse.json({
    codigo: pedidoSalvo.code,
    status: 'searching_professional',
    metodo,
    simulado: true,
  });
}
