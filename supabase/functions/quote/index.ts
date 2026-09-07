// Edge Function: POST /functions/v1/quote
// Passo 1 e passo 3 do funil. Valida cobertura pelo CEP, calcula o preço com o
// ruleset ativo da região, grava o lead e persiste a cotação assinada.
//
//   supabase functions deploy quote
//
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { priceGrid, quote as computeQuote } from '../_shared/pricing/index.ts';
import type { Frequency, Ruleset, ServiceCode } from '../_shared/pricing/types.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Body {
  service: ServiceCode;
  minutes: number;
  addons?: string[];
  frequency: Frequency;
  zipcode: string;
  email?: string;
  scheduledAt?: string;
  /** Lista de janelas para montar a grade de preços do passo 3. */
  slots?: string[];
  homeType?: 'HOUSE' | 'APARTMENT' | 'STUDIO' | 'COMMERCIAL';
  bedrooms?: number;
  bathrooms?: number;
  couponCode?: string;
  utm?: Record<string, string>;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const zip = body.zipcode.replace(/\D/g, '');
  if (zip.length !== 8) return json({ error: 'invalid_zipcode' }, 422);

  // ---------------------------------------------------------- 1. cobertura
  const { data: coverage } = await supabase
    .rpc('fn_is_covered', { p_zipcode: zip, p_service: body.service })
    .maybeSingle();

  if (body.email) {
    await supabase.from('leads').insert({
      email: body.email,
      zipcode: zip,
      service: body.service,
      covered: Boolean(coverage),
      utm: body.utm ?? null,
    });
  }

  if (!coverage) {
    return json(
      {
        covered: false,
        message: 'CEP fora da nossa área de atendimento. Avisamos assim que chegarmos aí.',
      },
      200,
    );
  }

  // ------------------------------------------------------------ 2. ruleset
  const { data: rs } = await supabase
    .from('pricing_rulesets')
    .select('id, version, rules')
    .eq('region_code', coverage.region_code)
    .eq('service', body.service)
    .eq('active', true)
    .maybeSingle();

  if (!rs) return json({ error: 'no_ruleset_for_region' }, 503);
  const ruleset = rs.rules as Ruleset;

  // -------------------------------------------------------------- 3. addons
  const { data: addonRows } = await supabase
    .from('service_addons')
    .select('code, name, extra_minutes')
    .in('code', body.addons ?? []);

  const addons = (addonRows ?? []).map((a) => ({
    code: a.code,
    name: a.name,
    extraMinutes: a.extra_minutes,
  }));

  // -------------------------------------------------------------- 4. cupom
  let couponPercent: number | undefined;
  if (body.couponCode) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('percent_off, active, expires_at')
      .eq('code', body.couponCode.toUpperCase())
      .maybeSingle();
    if (coupon?.active && (!coupon.expires_at || new Date(coupon.expires_at) > new Date())) {
      couponPercent = coupon.percent_off;
    }
  }

  const input = {
    service: body.service,
    minutes: body.minutes,
    addons,
    frequency: body.frequency,
    scheduledAt: body.scheduledAt,
    homeType: body.homeType,
    bedrooms: body.bedrooms,
    bathrooms: body.bathrooms,
    couponPercent,
  };

  // --------------------------------------------------------------- 5. preço
  try {
    const result = computeQuote(input, ruleset, rs.version);

    const grid = body.slots?.length
      ? priceGrid({ ...input, scheduledAt: undefined }, body.slots, ruleset)
      : undefined;

    const { data: saved } = await supabase
      .from('quotes')
      .insert({
        service: body.service,
        frequency: body.frequency,
        zipcode: zip,
        region_code: coverage.region_code,
        home_type: body.homeType ?? 'APARTMENT',
        bedrooms: body.bedrooms ?? 2,
        bathrooms: body.bathrooms ?? 1,
        addons: addons.map((a) => a.code),
        minutes: result.minutes,
        scheduled_at: body.scheduledAt ?? null,
        price_cents: result.priceCents,
        payout_cents: result.payoutCents,
        breakdown: result.breakdown,
        ruleset_id: rs.id,
        input_hash: result.inputHash,
      })
      .select('id, expires_at')
      .single();

    return json({
      covered: true,
      city: coverage.city,
      state: coverage.state,
      quoteId: saved?.id,
      expiresAt: saved?.expires_at,
      priceCents: result.priceCents,
      minutes: result.minutes,
      breakdown: result.breakdown,
      warnings: result.warnings,
      grid,
    });
  } catch (err) {
    const e = err as { code?: string; message: string };
    return json({ error: e.code ?? 'pricing_error', message: e.message }, 422);
  }
});
