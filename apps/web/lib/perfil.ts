import { supabase } from './supabase';

export type PapelUsuario = 'customer' | 'professional' | 'admin';

export interface Perfil {
  id: string;
  role: PapelUsuario;
  full_name: string;
  email: string;
  phone: string | null;
}

export const ROTA_POR_PAPEL: Record<PapelUsuario, string> = {
  customer: '/cliente',
  professional: '/profissional',
  admin: '/admin',
};

export async function buscarPerfil(): Promise<Perfil | null> {
  if (!supabase) return null;
  const { data: sessao } = await supabase.auth.getSession();
  const usuario = sessao.session?.user;
  if (!usuario) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, phone')
    .eq('id', usuario.id)
    .maybeSingle();

  return (data as Perfil) ?? null;
}
