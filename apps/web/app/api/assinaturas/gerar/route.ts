import { NextResponse } from 'next/server';
import { clienteServico } from '@/lib/supabase';
import { RULESET_PADRAO } from '@/lib/rulesetPadrao';
import { quote } from '@/lib/pricing';
import type { Ruleset, ServiceCode, Frequency } from '@/lib/pricing/types';
import { buscarOpcionais } from '@/lib/catalogoDb';
import { stripeConfigurado, cobrarAssinaturaOffSession } from '@/lib/stripe';

export const runtime = 'nodejs';

interface Pendente {
  subscription_id: string;
  customer_id: string;
  service: ServiceCode;
  frequency: Frequency;
  minutes: number;
  addons: string[];
  scheduled_at: string;
  zipcode: string;
}

/**
 * Gera as próximas diárias de assinaturas ativas, com preço calculado de
 * verdade (o motor de preço só existe em TypeScript, por isso isso não
 * pode ser feito só em SQL/pg_cron). Chamado pelo cron da Vercel.
 *
 * Duas travas, porque essa rota cria pedido em nome de outra pessoa:
 * CRON_SECRET é obrigatório (sem ele a rota não roda) e o acesso ao banco
 * usa a chave de serviço — as RPCs de assinatura não respondem mais para
 * anon nem para usuário logado.
 */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: 'nao_autorizado' }, { status: 401 });
  }
  const supabase = clienteServico();
  if (!supabase) {
    return NextResponse.json({ geradas: 0, motivo: 'sem_chave_de_servico' });
  }

  const { data } = await supabase.rpc('fn_assinaturas_para_gerar', { p_dias_a_frente: 3 });
  const pendentes = (data ?? []) as Pendente[];
  const opcionais = await buscarOpcionais(true);

  let geradas = 0;
  for (const p of pendentes) {
    const { data: cobertura } = await supabase
      .rpc('fn_is_covered', { p_zipcode: p.zipcode, p_service: p.service })
      .maybeSingle<{ region_code: string }>();

    let ruleset: Ruleset = RULESET_PADRAO;
    if (cobertura) {
      const { data: rs } = await supabase
        .from('pricing_rulesets')
        .select('rules')
        .eq('region_code', cobertura.region_code)
        .eq('service', p.service)
        .eq('active', true)
        .maybeSingle();
      if (rs) ruleset = rs.rules as Ruleset;
    }

    const addons = opcionais.filter((o) => p.addons.includes(o.code)).map((o) => ({
      code: o.code,
      name: o.nome,
      extraMinutes: o.minutos,
    }));

    try {
      const r = quote(
        { service: p.service, minutes: p.minutes, addons, frequency: p.frequency, scheduledAt: p.scheduled_at },
        ruleset,
      );

      // Sem Stripe configurada, mantém o comportamento simulado antigo:
      // nasce direto buscando profissional, sem cobrança nenhuma.
      const statusInicial = stripeConfigurado ? 'pending_payment' : 'searching_professional';
      const { data: novoId } = await supabase.rpc('fn_registrar_pedido_assinatura', {
        p_subscription_id: p.subscription_id,
        p_price_cents: r.priceCents,
        p_payout_cents: r.payoutCents,
        p_status: statusInicial,
      });
      if (!novoId) continue;
      geradas += 1;

      if (statusInicial !== 'pending_payment') continue;

      // Tenta cobrar sozinho no cartão salvo da primeira compra. Sem cartão
      // salvo (só pagou de Pix antes) ou cobrança recusada, o pedido fica
      // pending_payment mesmo — o cliente vê "Pagar novamente" na tela dele.
      const { data: donoDoCartao } = await supabase
        .from('customers')
        .select('stripe_customer_id, stripe_payment_method_id')
        .eq('id', p.customer_id)
        .maybeSingle();

      if (!donoDoCartao?.stripe_customer_id || !donoDoCartao?.stripe_payment_method_id) continue;

      const { paymentIntentId } = await cobrarAssinaturaOffSession({
        stripeCustomerId: donoDoCartao.stripe_customer_id,
        stripePaymentMethodId: donoDoCartao.stripe_payment_method_id,
        priceCents: r.priceCents,
        orderId: novoId,
      });
      if (!paymentIntentId) continue;

      await supabase.rpc('fn_confirmar_pagamento_pedido', {
        p_order_id: novoId,
        p_method: 'credit_card',
        p_amount_cents: r.priceCents,
        p_provider_reference: paymentIntentId,
        p_raw_payload: null,
      });
    } catch {
      // Pula essa ocorrência agora; o próximo tick tenta de novo.
    }
  }

  return NextResponse.json({ geradas, avaliadas: pendentes.length });
}
