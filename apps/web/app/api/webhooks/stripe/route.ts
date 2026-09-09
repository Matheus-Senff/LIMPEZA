import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { clienteServico } from '@/lib/supabase';
import { partesDaData } from '@/lib/data';
import type Stripe from 'stripe';

export const runtime = 'nodejs';

/**
 * Webhook da Stripe: única fonte de verdade de que um pedido foi pago.
 *
 * Nunca confia no retorno do navegador pra confirmar pagamento (o cliente
 * pode fechar a aba, cair a conexão, ou simplesmente mentir pra própria
 * URL) — só o evento assinado pela Stripe, verificado aqui no servidor,
 * libera o pedido pra busca de profissional.
 *
 * Pix é assíncrono: `checkout.session.completed` pode chegar com o
 * pagamento ainda `unpaid` (aguardando o cliente pagar o QR code) — nesse
 * caso o pagamento de verdade chega depois em
 * `checkout.session.async_payment_succeeded`. Cartão normalmente já vem
 * `paid` no `completed`. Os dois eventos passam pelo mesmo caminho; a RPC
 * garante que só o primeiro que chegar com o pedido ainda 'pending_payment'
 * tem efeito.
 */
export async function POST(req: Request) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  const servico = clienteServico();

  if (!stripe || !segredo || !servico) {
    return NextResponse.json({ erro: 'stripe_nao_configurada' }, { status: 503 });
  }

  const assinatura = req.headers.get('stripe-signature');
  const corpoBruto = await req.text();

  let evento: Stripe.Event;
  try {
    if (!assinatura) throw new Error('sem cabeçalho stripe-signature');
    evento = stripe.webhooks.constructEvent(corpoBruto, assinatura, segredo);
  } catch (e) {
    // Assinatura inválida: pode ser alguém tentando forjar um "pagamento
    // aprovado" direto no endpoint. Nunca processa sem verificar.
    return NextResponse.json({ erro: 'assinatura_invalida', mensagem: (e as Error).message }, { status: 400 });
  }

  if (evento.type !== 'checkout.session.completed' && evento.type !== 'checkout.session.async_payment_succeeded') {
    return NextResponse.json({ recebido: true });
  }

  const sessao = evento.data.object as Stripe.Checkout.Session;
  if (sessao.payment_status !== 'paid') {
    // completed com pix ainda não pago: espera o async_payment_succeeded.
    return NextResponse.json({ recebido: true });
  }

  const orderId = sessao.metadata?.order_id;
  // Com os dois métodos oferecidos juntos na Stripe, quem decide de fato é
  // o cliente na hora — a preferência gravada em metadata não é confiável
  // pra saber o que foi realmente usado. Pix sempre confirma pelo evento
  // assíncrono; cartão confirma direto no completed.
  const metodo = evento.type === 'checkout.session.async_payment_succeeded' ? 'pix' : 'credit_card';
  if (!orderId) {
    return NextResponse.json({ erro: 'sem_order_id_no_metadata' }, { status: 400 });
  }

  const referencia =
    typeof sessao.payment_intent === 'string' ? sessao.payment_intent : sessao.payment_intent?.id ?? sessao.id;

  const { data: confirmado } = await servico.rpc('fn_confirmar_pagamento_pedido', {
    p_order_id: orderId,
    p_method: metodo,
    p_amount_cents: sessao.amount_total ?? 0,
    p_provider_reference: referencia,
    p_raw_payload: evento as unknown as Record<string, unknown>,
  });

  // false = pedido já não estava mais 'pending_payment' (webhook duplicado,
  // ou pedido cancelado nesse meio tempo) — não é erro, só não repete o efeito.
  if (!confirmado) {
    return NextResponse.json({ recebido: true, ja_processado: true });
  }

  // Assinatura (semanal/quinzenal/mensal): só registra a recorrência de
  // verdade depois que a primeira diária foi paga.
  const { data: pedido } = await servico
    .from('orders')
    .select('id, customer_id, address_id, service, frequency, minutes, addons, scheduled_at')
    .eq('id', orderId)
    .maybeSingle();

  // Salva o cartão pra cobrar sozinho as próximas diárias de uma assinatura
  // (ver /api/assinaturas/gerar). Só quando pagou de cartão — Pix não tem
  // "método salvo" reaproveitável pra cobrança automática.
  if (pedido && metodo === 'credit_card') {
    const custId = typeof sessao.customer === 'string' ? sessao.customer : sessao.customer?.id;
    if (custId) {
      const intent = await stripe.paymentIntents.retrieve(referencia);
      const pmId = typeof intent.payment_method === 'string' ? intent.payment_method : intent.payment_method?.id;
      if (pmId) {
        await servico
          .from('customers')
          .update({ stripe_customer_id: custId, stripe_payment_method_id: pmId })
          .eq('id', pedido.customer_id);
      }
    }
  }

  if (pedido && pedido.frequency !== 'SINGLE') {
    const { weekday, windowStart, startDate } = partesDaData(pedido.scheduled_at);
    const assistencia =
      pedido.frequency === 'WEEKLY' ? 'complete' : pedido.frequency === 'BIWEEKLY' ? 'basic' : 'standard';
    const passoDias = pedido.frequency === 'WEEKLY' ? 7 : pedido.frequency === 'BIWEEKLY' ? 14 : 30;
    const proximaData = new Date(`${startDate}T00:00:00Z`);
    proximaData.setUTCDate(proximaData.getUTCDate() + passoDias);

    const { data: assinaturaCriada } = await servico
      .from('subscriptions')
      .insert({
        customer_id: pedido.customer_id,
        address_id: pedido.address_id,
        service: pedido.service,
        frequency: pedido.frequency,
        minutes: pedido.minutes,
        addons: pedido.addons,
        weekday,
        window_start: windowStart,
        assistance_level: assistencia,
        start_date: startDate,
        next_run_date: proximaData.toISOString().slice(0, 10),
      })
      .select('id')
      .single();

    if (assinaturaCriada) {
      await servico.from('orders').update({ subscription_id: assinaturaCriada.id }).eq('id', orderId);
    }
  }

  return NextResponse.json({ recebido: true });
}
