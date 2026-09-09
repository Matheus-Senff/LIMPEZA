import { supabase } from './supabase';
import {
  SERVICOS as SERVICOS_PADRAO,
  OPCIONAIS as OPCIONAIS_PADRAO,
  type Servico,
  type Opcional,
  type ServiceCode,
} from './catalogo';

/**
 * Catálogo de verdade vem do banco (`services` / `service_addons`) — a
 * admin edita pela tela e o sistema inteiro (funil, cotação, pedidos,
 * assinaturas) passa a usar o valor novo na hora. As constantes de
 * `catalogo.ts` continuam existindo só como piso: se o Supabase cair ou as
 * tabelas ficarem vazias, o app não trava, cai pros valores que já
 * estavam no ar antes dessa migração.
 */

interface LinhaServico {
  code: ServiceCode;
  name: string;
  slug: string | null;
  short_name: string | null;
  tagline: string | null;
  description: string | null;
  availability: 'TODAY' | 'TOMORROW';
  brings_products: boolean;
  min_minutes: number;
  suggested_minutes: number;
  max_minutes: number;
  audience: 'HOME' | 'BUSINESS';
  included: string[];
  not_included: string[];
  active: boolean;
}

function paraServico(r: LinhaServico): Servico {
  const padrao = SERVICOS_PADRAO.find((s) => s.code === r.code);
  return {
    code: r.code,
    slug: r.slug || padrao?.slug || r.code.toLowerCase(),
    nome: r.name || padrao?.nome || r.code,
    nomeCurto: r.short_name || padrao?.nomeCurto || (padrao?.nome ?? r.code),
    chamada: r.tagline || padrao?.chamada || '',
    descricao: r.description || padrao?.descricao || '',
    disponibilidade: r.availability === 'TODAY' ? 'hoje' : 'amanha',
    trazProdutos: r.brings_products,
    minMinutos: r.min_minutes,
    sugeridoMinutos: r.suggested_minutes,
    maxMinutos: r.max_minutes,
    publico: r.audience === 'BUSINESS' ? 'empresa' : 'lar',
    incluso: r.included?.length ? r.included : padrao?.incluso ?? [],
    naoIncluso: r.not_included?.length ? r.not_included : padrao?.naoIncluso ?? [],
  };
}

export async function buscarServicos(incluirInativos = false): Promise<Servico[]> {
  if (!supabase) return SERVICOS_PADRAO;
  let query = supabase.from('services').select('*').order('sort_order');
  if (!incluirInativos) query = query.eq('active', true);
  const { data, error } = await query;
  if (error || !data || data.length === 0) return SERVICOS_PADRAO;
  return data.map((r) => paraServico(r as unknown as LinhaServico));
}

interface LinhaAddon {
  code: string;
  name: string;
  extra_minutes: number;
  services: ServiceCode[];
  active: boolean;
}

export async function buscarOpcionais(incluirInativos = false): Promise<Opcional[]> {
  if (!supabase) return OPCIONAIS_PADRAO;
  let query = supabase.from('service_addons').select('*').order('sort_order');
  if (!incluirInativos) query = query.eq('active', true);
  const { data, error } = await query;
  if (error || !data) return OPCIONAIS_PADRAO;
  return (data as unknown as LinhaAddon[]).map((r) => ({
    code: r.code,
    nome: r.name,
    minutos: r.extra_minutes,
    servicos: r.services,
  }));
}

export async function buscarPorCodigo(code: ServiceCode): Promise<Servico | undefined> {
  const servicos = await buscarServicos(true);
  return servicos.find((s) => s.code === code);
}

export async function buscarPorSlug(slug: string): Promise<Servico | undefined> {
  const servicos = await buscarServicos();
  return servicos.find((s) => s.slug === slug);
}
