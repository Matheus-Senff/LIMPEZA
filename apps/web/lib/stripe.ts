import Stripe from 'stripe';

const chaveSecreta = process.env.STRIPE_SECRET_KEY;

/**
 * Cliente Stripe do servidor — nunca chega ao browser. Sem a env var, fica
 * `null` e quem chama cai de volta pro fluxo simulado (mesma resiliência que
 * o resto do projeto já tem para Supabase/Sentry sem configuração).
 */
export const stripe: Stripe | null = chaveSecreta ? new Stripe(chaveSecreta) : null;

export const stripeConfigurado = Boolean(chaveSecreta);

/**
 * Cria a sessão de Checkout de um pedido — usado tanto na criação do
 * pedido quanto pra gerar uma nova cobrança de um checkout abandonado
 * (ver /api/pedido/[id]/reenviar-pagamento). Pix, débito e crédito juntos;
 * cai pra só cartão se o Pix não estiver habilitado na conta Stripe.
 *
 * Cartão fica em autorização (`capture_method: 'manual'`): o dinheiro é
 * só reservado no limite do cliente, e a cobrança de fato (captura) só
 * acontece quando o profissional faz check-out (ver capturarPagamentoPedido
 * abaixo). Pix não suporta esse modo — continua cobrando na hora, como
 * sempre foi (é um pagamento à vista por natureza, não tem "autorizar e
 * capturar depois").
 */
export async function criarSessaoCheckout(params: {
  origem: string;
  orderId: string;
  priceCents: number;
  nomeServico: string;
  customerEmail?: string;
  metodo: string;
  stripeCustomerId?: string | null;
}) {
  if (!stripe) throw new Error('Stripe não configurada');

  const paramsBase = {
    mode: 'payment' as const,
    ...(params.stripeCustomerId
      ? { customer: params.stripeCustomerId }
      : { customer_email: params.customerEmail, customer_creation: 'always' as const }),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'brl',
          unit_amount: params.priceCents,
          product_data: { name: `Plano Limpo — ${params.nomeServico}` },
        },
      },
    ],
    // Cartão fica salvo (setup_future_usage) pra cobrar sozinho as próximas
    // diárias de uma assinatura — ver cobrarAssinaturaOffSession abaixo.
    // Pix não entra aqui: não existe "pix salvo" reutilizável pra recorrência.
    payment_method_options: {
      card: { capture_method: 'manual' as const, setup_future_usage: 'off_session' as const },
    },
    metadata: { order_id: params.orderId, metodo: params.metodo },
    success_url: `${params.origem}/cliente/pedidos/${params.orderId}?pago=processando`,
    cancel_url: `${params.origem}/cliente/pedidos/${params.orderId}?pagamento=cancelado`,
  };

  try {
    return await stripe.checkout.sessions.create({ ...paramsBase, payment_method_types: ['card', 'pix'] });
  } catch {
    return await stripe.checkout.sessions.create({ ...paramsBase, payment_method_types: ['card'] });
  }
}

/**
 * Cobra a diária seguinte de uma assinatura direto no cartão salvo, sem o
 * cliente precisar fazer nada (ver /api/assinaturas/gerar). Mesma captura
 * em duas etapas do pedido avulso: autoriza agora, só é cobrado de fato
 * no check-out do profissional. `off_session: true` avisa a Stripe que o
 * cliente não está na tela — ela pode recusar pedindo autenticação nova
 * (cartão que exige 3DS de novo, por exemplo); nesse caso cai pro
 * fallback de pending_payment + "Pagar novamente", como se não tivesse
 * cartão salvo nenhum.
 */
export async function cobrarAssinaturaOffSession(params: {
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  priceCents: number;
  orderId: string;
}): Promise<{ paymentIntentId: string | null; erro?: string }> {
  if (!stripe) return { paymentIntentId: null };
  try {
    const intent = await stripe.paymentIntents.create({
      amount: params.priceCents,
      currency: 'brl',
      customer: params.stripeCustomerId,
      payment_method: params.stripePaymentMethodId,
      capture_method: 'manual',
      off_session: true,
      confirm: true,
      metadata: { order_id: params.orderId },
    });
    if (intent.status !== 'requires_capture' && intent.status !== 'succeeded') {
      return { paymentIntentId: null, erro: `status inesperado: ${intent.status}` };
    }
    return { paymentIntentId: intent.id };
  } catch (e) {
    return { paymentIntentId: null, erro: (e as Error).message };
  }
}

/**
 * Captura o cartão autorizado quando o profissional faz check-out (ver
 * fn_check_out / /api/pedido/[id]/finalizar-profissional). Se o pedido foi
 * pago via Pix (já cobrado na hora, sem autorização pendente) ou o
 * PaymentIntent já não está mais em `requires_capture` por qualquer
 * motivo, não faz nada — não é erro, só não tinha o que capturar.
 */
export async function capturarPagamentoPedido(
  servico: import('@supabase/supabase-js').SupabaseClient,
  orderId: string,
): Promise<{ capturado: boolean; erro?: string }> {
  if (!stripe) return { capturado: false };

  const { data: pagamento } = await servico
    .from('payments')
    .select('id, gateway_reference')
    .eq('order_id', orderId)
    .eq('gateway', 'stripe')
    .eq('status', 'paid')
    .maybeSingle();

  if (!pagamento?.gateway_reference) return { capturado: false };

  try {
    const intent = await stripe.paymentIntents.retrieve(pagamento.gateway_reference);
    if (intent.status !== 'requires_capture') return { capturado: false };
    await stripe.paymentIntents.capture(pagamento.gateway_reference);
    return { capturado: true };
  } catch (e) {
    return { capturado: false, erro: (e as Error).message };
  }
}

/**
 * Expira a sessão de Checkout de um pedido cancelado antes de terminar de
 * pagar — sem isso, uma aba antiga com o checkout ainda aberto poderia
 * confirmar um pagamento pra um pedido que já foi cancelado por aqui.
 * Melhor esforço: se a sessão já foi paga/expirada/não existe mais, a
 * Stripe recusa e a gente ignora — o pedido já está cancelado de qualquer
 * jeito, isso aqui só fecha a portinha secundária.
 */
export async function expirarSessaoCheckout(sessionId: string | null | undefined) {
  if (!stripe || !sessionId) return;
  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch {
    // já paga, já expirada, ou nunca existiu — nada a fazer.
  }
}

/**
 * Estorna (parcial ou total) o pagamento de um pedido cancelado, ou solta
 * a autorização de cartão que nunca chegou a ser capturada. `null` quando
 * não há nada a estornar (nunca foi pago) ou a Stripe não está configurada;
 * string com o erro se a chamada à Stripe falhar — nesse caso o pedido já
 * está cancelado, só o estorno que precisa de atenção manual (dá pra ver e
 * agir pelo dashboard da própria Stripe).
 */
export async function estornarPagamentoPedido(
  servico: import('@supabase/supabase-js').SupabaseClient,
  orderId: string,
  valorAReembolsarCents: number,
): Promise<{ reembolsado: boolean; erro?: string }> {
  if (!stripe || valorAReembolsarCents <= 0) return { reembolsado: false };

  const { data: pagamento } = await servico
    .from('payments')
    .select('id, gateway_reference, amount_cents, status')
    .eq('order_id', orderId)
    .eq('gateway', 'stripe')
    .eq('status', 'paid')
    .maybeSingle();

  if (!pagamento?.gateway_reference) return { reembolsado: false };

  const taxaCents = Math.max(0, pagamento.amount_cents - valorAReembolsarCents);

  try {
    // Cartão em autorização (capture_method manual) ainda não foi cobrado
    // de verdade — "estornar" aqui significa soltar a reserva no limite do
    // cliente, não devolver dinheiro que nunca saiu da conta dele. Se há
    // taxa de cancelamento, captura só a taxa (é a única cobrança real que
    // deve acontecer) em vez de cancelar a autorização inteira.
    const intent = await stripe.paymentIntents.retrieve(pagamento.gateway_reference);
    if (intent.status === 'requires_capture') {
      if (taxaCents > 0) {
        await stripe.paymentIntents.capture(pagamento.gateway_reference, { amount_to_capture: taxaCents });
      } else {
        await stripe.paymentIntents.cancel(pagamento.gateway_reference);
      }
    } else {
      await stripe.refunds.create({
        payment_intent: pagamento.gateway_reference,
        amount: Math.min(valorAReembolsarCents, pagamento.amount_cents),
      });
    }
    await servico.from('payments').update({ status: 'refunded', refunded_at: new Date().toISOString() }).eq('id', pagamento.id);
    return { reembolsado: true };
  } catch (e) {
    return { reembolsado: false, erro: (e as Error).message };
  }
}
