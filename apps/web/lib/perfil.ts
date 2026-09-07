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

export interface Papeis {
  cliente: boolean;
  profissional: boolean;
}

/**
 * Um mesmo e-mail pode virar cliente E profissional (cadastros separados).
 * `profiles.role` guarda só o último papel completado — quem manda de
 * verdade, pra saber o que essa pessoa pode acessar, é ter ou não a linha
 * em `customers`/`professionals`.
 */
export async function buscarPapeis(usuarioId: string): Promise<Papeis> {
  if (!supabase) return { cliente: false, profissional: false };
  const [cliente, profissional] = await Promise.all([
    supabase.from('customers').select('id').eq('id', usuarioId).maybeSingle(),
    supabase.from('professionals').select('id').eq('id', usuarioId).maybeSingle(),
  ]);
  return { cliente: Boolean(cliente.data), profissional: Boolean(profissional.data) };
}
