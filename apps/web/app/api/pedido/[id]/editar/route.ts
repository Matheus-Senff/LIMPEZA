import { NextResponse } from 'next/server';
import { clienteComToken, tokenDaRequisicao } from '@/lib/supabase';
import { RULESET_PADRAO } from '@/lib/rulesetPadrao';
import { quote } from '@/lib/pricing';
import type { HomeType, Ruleset } from '@/lib/pricing/types';
import { OPCIONAIS, SERVICOS } from '@/lib/catalogo';

export const runtime = 'nodejs';

interface Cobertura {
  covered: boolean;
  region_code: string;
  city: string;
  state: string;
}

/**
 * Edita um pedido que ainda está procurando profissional. O preço nunca
 * vem do corpo da requisição: é recalculado aqui a partir dos minutos
 * "base" (total atual menos os opcionais atuais), igual ao funil faz,
 * e só é aplicado via fn_editar_pedido, que rejeita se o pedido já foi
 * aceito por alguém.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: 'json_invalido' }, { status: 400 });

  const token = tokenDaRequisicao(req);
  const cliente = token ? clienteComToken(token) : null;
  if (!cliente) return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 });

  const { data: pedido } = await cliente
    .from('orders')
    .select('id, service, frequency, minutes, addons, scheduled_at, status, address_id')
    .eq('id', id)
    .maybeSingle();

  if (!pedido) return NextResponse.json({ erro: 'pedido_nao_encontrado' }, { status: 404 });
  if (pedido.status !== 'searching_professional') {
    return NextResponse.json({ erro: 'pedido_ja_aceito' }, { status: 409 });
  }

  const { data: endereco } = await cliente
    .from('addresses')
    .select('zipcode')
    .eq('id', pedido.address_id)
    .maybeSingle();
  if (!endereco) return NextResponse.json({ erro: 'endereco_nao_encontrado' }, { status: 404 });

  const servico = SERVICOS.find((s) => s.code === pedido.service);
  if (!servico) return NextResponse.json({ erro: 'servico_invalido' }, { status: 422 });

  const codigosAtuais: string[] = pedido.addons ?? [];
  const minutosAtuaisExtra = codigosAtuais.reduce(
    (s, c) => s + (OPCIONAIS.find((o) => o.code === c)?.minutos ?? 0),
    0,
  );
  const minutosBase = Math.max(servico.minMinutos, pedido.minutes - minutosAtuaisExtra);

  const codigosNovos: string[] = Array.isArray(body.addons) ? body.addons : [];
  const addons = OPCIONAIS.filter((o) => codigosNovos.includes(o.code)).map((o) => ({
    code: o.code,
    name: o.nome,
    extraMinutes: o.minutos,
  }));

  let ruleset: Ruleset = RULESET_PADRAO;
  let rulesetVersao = 0;

  const { data: cobertura } = await cliente
    .rpc('fn_is_covered', { p_zipcode: endereco.zipcode, p_service: pedido.service })
    .maybeSingle<Cobertura>();
  if (!cobertura) return NextResponse.json({ erro: 'fora_de_cobertura' }, { status: 422 });

  const { data: rs } = await cliente
    .from('pricing_rulesets')
    .select('rules, version')
    .eq('region_code', cobertura.region_code)
    .eq('service', pedido.service)
    .eq('active', true)
    .maybeSingle();
  if (rs) {
    ruleset = rs.rules as Ruleset;
    rulesetVersao = rs.version;
  }

  const bedrooms = Number(body.bedrooms ?? 2);
  const bathrooms = Number(body.bathrooms ?? 1);
  const homeType = String(body.homeType ?? 'APARTMENT');
  const accessNotes = body.accessNotes ? String(body.accessNotes) : null;

  try {
    const r = quote(
      {
        service: pedido.service,
        minutes: minutosBase,
        addons,
        frequency: pedido.frequency,
        scheduledAt: pedido.scheduled_at,
        homeType: homeType as HomeType,
        bedrooms,
        bathrooms,
      },
      ruleset,
      rulesetVersao,
    );

    const { data: ok } = await cliente.rpc('fn_editar_pedido', {
      p_order_id: id,
      p_addons: codigosNovos,
      p_minutes: r.minutes,
      p_price_cents: r.priceCents,
      p_payout_cents: r.payoutCents,
      p_price_breakdown: r.breakdown,
      p_home_type: homeType,
      p_bedrooms: bedrooms,
      p_bathrooms: bathrooms,
      p_access_notes: accessNotes,
    });

    if (!ok) {
      return NextResponse.json({ erro: 'pedido_ja_aceito' }, { status: 409 });
    }

    return NextResponse.json({ ok: true, precoCentavos: r.priceCents, minutos: r.minutes });
  } catch (e) {
    const erro = e as { code?: string; message: string };
    return NextResponse.json({ erro: erro.code ?? 'erro_de_preco', mensagem: erro.message }, { status: 422 });
  }
}
