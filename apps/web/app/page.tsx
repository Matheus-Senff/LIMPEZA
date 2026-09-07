'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Marca';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { buscarPerfil, ROTA_POR_PAPEL } from '@/lib/perfil';

export default function Entrar() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const perfil = await buscarPerfil();
      if (perfil) {
        router.replace(ROTA_POR_PAPEL[perfil.role]);
        return;
      }
      setVerificando(false);
    })();
  }, [router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!supabase) {
      setErro('Login indisponível: Supabase não está configurado neste ambiente.');
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);

    if (error) {
      setErro('E-mail ou senha incorretos.');
      return;
    }

    const perfil = await buscarPerfil();
    router.replace(perfil ? ROTA_POR_PAPEL[perfil.role] : '/cadastrar');
  }

  if (verificando) return null;

  return (
    <main className="grid min-h-screen place-items-center bg-tinta-5 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="cartao p-7">
          <h1 className="text-xl font-bold tracking-tight">Entrar</h1>
          <p className="mt-1 text-sm text-tinta-50">Acesse sua conta para continuar.</p>

          <form onSubmit={entrar} className="mt-6 flex flex-col gap-3">
            <input
              type="email"
              required
              className="campo"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="E-mail"
            />
            <input
              type="password"
              required
              className="campo"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              aria-label="Senha"
            />
            {erro && (
              <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">
                {erro}
              </p>
            )}
            {!supabaseConfigurado && (
              <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-xs text-tinta-70">
                Ambiente sem Supabase configurado.
              </p>
            )}
            <button className="btn-primario w-full" disabled={carregando}>
              {carregando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-tinta-50">
          Ainda não tem conta?{' '}
          <Link href="/cadastrar" className="font-semibold text-tinta">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
