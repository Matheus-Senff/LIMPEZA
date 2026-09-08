'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Marca';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { buscarPapeis, buscarPerfil, type Perfil } from '@/lib/perfil';

export default function Entrar() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [escolhendo, setEscolhendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Decide pra onde mandar depois de confirmar que a sessão é válida: se o
  // e-mail tem conta de cliente E de profissional, mostra a escolha aqui
  // mesmo em vez de chutar uma das duas.
  async function seguirPara(perfil: Perfil) {
    if (perfil.role === 'admin') {
      router.replace('/admin');
      return;
    }
    const papeis = await buscarPapeis(perfil.id);
    if (papeis.cliente && papeis.profissional) {
      setEscolhendo(true);
      setVerificando(false);
      return;
    }
    if (papeis.profissional) {
      router.replace('/profissional');
      return;
    }
    if (papeis.cliente) {
      router.replace('/cliente');
      return;
    }
    router.replace('/cadastrar');
  }

  useEffect(() => {
    (async () => {
      const perfil = await buscarPerfil();
      if (perfil) {
        await seguirPara(perfil);
        return;
      }
      setVerificando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (perfil) {
      await seguirPara(perfil);
    } else {
      router.replace('/cadastrar');
    }
  }

  if (verificando) return null;

  return (
    <main className="grid min-h-screen place-items-center bg-tinta-5 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        {escolhendo ? (
          <div className="cartao p-7">
            <h1 className="text-xl font-bold tracking-tight">Como quer entrar?</h1>
            <p className="mt-1 text-sm text-tinta-50">Sua conta tem acesso como cliente e como profissional.</p>
            <div className="mt-6 flex flex-col gap-3">
              <button onClick={() => router.replace('/cliente')} className="cartao p-5 text-left transition hover:border-tinta-20">
                <p className="font-bold">Entrar como cliente</p>
                <p className="mt-1 text-sm text-tinta-50">Contratar e acompanhar serviços.</p>
              </button>
              <button onClick={() => router.replace('/profissional')} className="cartao p-5 text-left transition hover:border-tinta-20">
                <p className="font-bold">Entrar como profissional</p>
                <p className="mt-1 text-sm text-tinta-50">Ver e atender pedidos.</p>
              </button>
            </div>
          </div>
        ) : (
          <>
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
                <Link href="/recuperar-senha" className="text-center text-sm text-tinta-50">
                  Esqueci minha senha
                </Link>
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-tinta-50">
              Ainda não tem conta?{' '}
              <Link href="/cadastrar" className="font-semibold text-tinta">
                Criar conta
              </Link>
            </p>
            <p className="mt-3 text-center text-xs text-tinta-30">
              <Link href="/termos" className="underline">
                Termos de uso
              </Link>{' '}
              ·{' '}
              <Link href="/privacidade" className="underline">
                Política de privacidade
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
