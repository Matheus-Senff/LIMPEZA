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
 * Estorna (parcial ou total) o pagamento de um pedido cancelado. Cartão e
 * Pix cobram na hora (ver /api/pedido) — sem isso, "cancelamento sem taxa"
 * seria só uma frase bonita: o dinheiro ficaria retido de qualquer jeito.
 * `null` quando não há nada a estornar (nunca foi pago) ou a Stripe não
 * está configurada; string com o erro se a chamada à Stripe falhar — nesse
 * caso o pedido já está cancelado, só o estorno que precisa de atenção
 * manual (dá pra ver e agir pelo dashboard da própria Stripe).
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

  try {
    await stripe.refunds.create({
      payment_intent: pagamento.gateway_reference,
      amount: Math.min(valorAReembolsarCents, pagamento.amount_cents),
    });
    await servico.from('payments').update({ status: 'refunded', refunded_at: new Date().toISOString() }).eq('id', pagamento.id);
    return { reembolsado: true };
  } catch (e) {
    return { reembolsado: false, erro: (e as Error).message };
  }
}
