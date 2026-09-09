import { NextResponse } from 'next/server';
import { clienteComToken, tokenDaRequisicao } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Geocodifica um bairro pra mostrar no mapa do profissional, com cache em
 * `district_centroids` (nunca bate no Nominatim de novo pro mesmo bairro).
 * Best-effort: se o serviço externo falhar, devolve sem coordenada — o
 * mapa cai pra posição aproximada da cidade em vez de travar.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: 'json_invalido' }, { status: 400 });

  const cidade = String(body.city ?? '').trim();
  const estado = String(body.state ?? '')
    .trim()
    .slice(0, 2)
    .toUpperCase();
  const bairro = String(body.district ?? '').trim();
  if (!cidade || !estado || !bairro) {
    return NextResponse.json({ erro: 'dados_incompletos' }, { status: 400 });
  }

  const token = tokenDaRequisicao(req);
  const cliente = token ? clienteComToken(token) : null;
  if (!cliente) return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 });

  const { data: existente } = await cliente
    .from('district_centroids')
    .select('lat, lng')
    .eq('city', cidade)
    .eq('state', estado)
    .eq('district', bairro)
    .maybeSingle();

  if (existente) {
    return NextResponse.json({ lat: existente.lat, lng: existente.lng });
  }

  try {
    const consulta = `${bairro}, ${cidade}, ${estado}, Brasil`;
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(consulta)}`,
      {
        headers: { 'User-Agent': 'PlanoLimpo/1.0 (contato@planolimpo.app)' },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!r.ok) return NextResponse.json({ lat: null, lng: null });

    const resultados = (await r.json()) as { lat: string; lon: string }[];
    const primeiro = resultados[0];
    if (!primeiro) return NextResponse.json({ lat: null, lng: null });

    const lat = Number(primeiro.lat);
    const lng = Number(primeiro.lon);

    await cliente.rpc('fn_upsert_centroide_bairro', {
      p_city: cidade,
      p_state: estado,
      p_district: bairro,
      p_lat: lat,
      p_lng: lng,
    });

    return NextResponse.json({ lat, lng });
  } catch {
    return NextResponse.json({ lat: null, lng: null });
  }
}
