import { NextResponse } from 'next/server';
import { clienteComToken, supabase, tokenDaRequisicao } from '@/lib/supabase';
import { RULESET_PADRAO } from '@/lib/rulesetPadrao';
import { quote } from '@/lib/pricing';
import type { Frequency, Ruleset, ServiceCode } from '@/lib/pricing/types';
import { OPCIONAIS } from '@/lib/catalogo';

export const runtime = 'nodejs';

interface Cobertura {
  covered: boolean;
  region_code: string;
  city: string;
  state: string;
}


/**
 * Cotação assinada: recalcula o preço no servidor, grava em `quotes` com hash
 * das entradas e validade de 30 minutos. O checkout só aceita um quoteId —
 * assim o cliente nunca paga um valor diferente do que viu na tela.
 * O repasse ao profissional sai do mesmo cálculo e NÃO volta para o browser.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: 'json_invalido' }, { status: 400 });

  const token = tokenDaRequisicao(req);
  const usuarioId = token && supabase ? (await supabase.auth.getUser(token)).data.user?.id ?? null : null;
  // A cotação é gravada com o token do usuário: só assim o RLS reconhece o
  // dono da linha na hora de ler de volta (a leitura por id foi fechada,
  // porque expunha preço e repasse de todo mundo).
  const clienteDono = token ? clienteComToken(token) : null;

  const cep = String(body.zipcode ?? '').replace(/\D/g, '');
  const service = String(body.service ?? 'CLEANING') as ServiceCode;
  const frequency = String(body.frequency ?? 'SINGLE') as Frequency;
  const codigosAddons: string[] = Array.isArray(body.addons) ? body.addons : [];
  const addons = OPCIONAIS.filter((o) => codigosAddons.includes(o.code)).map((o) => ({
    code: o.code,
    name: o.nome,
    extraMinutes: o.minutos,
  }));

  let ruleset: Ruleset = RULESET_PADRAO;
  let rulesetId: string | null = null;
  let rulesetVersao = 0;
  let regiao = 'SP-CAPITAL';

  if (supabase) {
    const { data: cobertura } = await supabase
      .rpc('fn_is_covered', { p_zipcode: cep, p_service: service })
      .maybeSingle<Cobertura>();

    if (!cobertura) {
      return NextResponse.json({ erro: 'fora_de_cobertura' }, { status: 422 });
    }
    regiao = cobertura.region_code;

    const { data: rs } = await supabase
      .from('pricing_rulesets')
      .select('id, version, rules')
      .eq('region_code', regiao)
      .eq('service', service)
      .eq('active', true)
      .maybeSingle();

    if (rs) {
      ruleset = rs.rules as Ruleset;
      rulesetId = rs.id;
      rulesetVersao = rs.version;
    }
  }

  try {
    const r = quote(
      {
        service,
        minutes: Number(body.minutes ?? 240),
        addons,
        frequency,
        scheduledAt: body.scheduledAt || undefined,
        homeType: body.homeType,
        bedrooms: Number(body.bedrooms ?? 2),
        bathrooms: Number(body.bathrooms ?? 1),
      },
      ruleset,
      rulesetVersao,
    );

    let quoteId: string | null = null;
    let expiraEm: string | null = null;

    if (clienteDono && usuarioId && rulesetId) {
      const { data } = await clienteDono
        .from('quotes')
        .insert({
          customer_id: usuarioId,
          service,
          frequency,
          zipcode: cep,
          region_code: regiao,
          home_type: body.homeType ?? 'APARTMENT',
          bedrooms: Number(body.bedrooms ?? 2),
          bathrooms: Number(body.bathrooms ?? 1),
          addons: addons.map((a) => a.code),
          minutes: r.minutes,
          scheduled_at: body.scheduledAt || null,
          price_cents: r.priceCents,
          payout_cents: r.payoutCents,
          breakdown: r.breakdown,
          ruleset_id: rulesetId,
          input_hash: r.inputHash,
        })
        .select('id, expires_at')
        .single();

      quoteId = data?.id ?? null;
      expiraEm = data?.expires_at ?? null;
    }

    // payoutCents fica no servidor de propósito.
    return NextResponse.json({
      quoteId,
      expiraEm,
      precoCentavos: r.priceCents,
      minutos: r.minutes,
      quebra: r.breakdown,
      avisos: r.warnings,
    });
  } catch (e) {
    const erro = e as { code?: string; message: string };
    return NextResponse.json({ erro: erro.code ?? 'erro_de_preco', mensagem: erro.message }, { status: 422 });
  }
}
