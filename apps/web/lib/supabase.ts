import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Cliente único, com a chave publicável. Todo acesso passa por RLS —
 * a chave de service role nunca chega ao browser nem ao repositório.
 * Sem variáveis configuradas o app continua de pé: o funil cai para o
 * ruleset local e as telas internas mostram estado vazio.
 */
export const supabase: SupabaseClient | null =
  url && chave ? createClient(url, chave, { auth: { persistSession: true } }) : null;

export const supabaseConfigurado = Boolean(url && chave);

/**
 * Cliente de servidor por requisição, autenticado com o JWT do usuário
 * (Authorization: Bearer …) enviado pelo browser. É esse client — não o
 * singleton acima — que deve gravar dados em nome do usuário: assim o
 * RLS enxerga auth.uid() corretamente nas policies (`customer_id = auth.uid()`).
 */
export function clienteComToken(token: string): SupabaseClient | null {
  if (!url || !chave) return null;
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export function tokenDaRequisicao(req: Request): string | null {
  const cabecalho = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!cabecalho?.startsWith('Bearer ')) return null;
  return cabecalho.slice('Bearer '.length);
}
