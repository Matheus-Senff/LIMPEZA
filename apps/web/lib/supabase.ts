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
