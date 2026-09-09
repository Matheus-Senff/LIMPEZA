import { NextResponse } from 'next/server';
import { bairroDoCep } from '@/lib/viacep';
import { supabase } from '@/lib/supabase';
import { RULESET_PADRAO } from '@/lib/rulesetPadrao';

export const runtime = 'nodejs';

interface Cobertura {
  covered: boolean;
  region_code: string;
  city: string;
  state: string;
}


/**
 * Passo 1 do funil: valida o CEP, registra o lead e devolve as regras de preço
 * ativas da região. O cliente calcula os preços da grade localmente — o mesmo
 * desenho do líder de mercado, que serve o motor de preço ao browser.
 * A cotação que vale é sempre a assinada em /api/cotacao.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: 'json_invalido' }, { status: 400 });

  const cep = String(body.zipcode ?? '').replace(/\D/g, '');
  const service = String(body.service ?? 'CLEANING');
  const email = typeof body.email === 'string' ? body.email.trim() : null;

  if (cep.length !== 8) {
    return NextResponse.json({ coberto: false, mensagem: 'Informe um CEP válido, com 8 dígitos.' });
  }

  // Sem banco configurado o funil continua funcionando com as regras locais.
  if (!supabase) {
    return NextResponse.json({
      coberto: true,
      cidade: 'sua região',
      estado: '',
      regiao: 'SP-CAPITAL',
      ruleset: RULESET_PADRAO,
      rulesetVersao: 0,
      modoDemonstracao: true,
    });
  }

  const { data: cobertura } = await supabase
    .rpc('fn_is_covered', { p_zipcode: cep, p_service: service })
    .maybeSingle<Cobertura>();

  if (email) {
    await supabase.from('leads').insert({
      email,
      zipcode: cep,
      service,
      covered: Boolean(cobertura),
    });
  }

  if (!cobertura) {
    return NextResponse.json({
      coberto: false,
      mensagem: 'Ainda não atendemos este CEP. Avisamos você assim que a Plano Limpo chegar aí.',
    });
  }

  const { data: ruleset } = await supabase
    .from('pricing_rulesets')
    .select('id, version, rules')
    .eq('region_code', cobertura.region_code)
    .eq('service', service)
    .eq('active', true)
    .maybeSingle();

  return NextResponse.json({
    coberto: true,
    cidade: cobertura.city,
    estado: cobertura.state,
    bairro: await bairroDoCep(cep),
    regiao: cobertura.region_code,
    ruleset: ruleset?.rules ?? RULESET_PADRAO,
    rulesetId: ruleset?.id ?? null,
    rulesetVersao: ruleset?.version ?? 0,
  });
}
