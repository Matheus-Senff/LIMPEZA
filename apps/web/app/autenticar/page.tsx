'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Cabecalho } from '@/components/Cabecalho';
import { Rodape } from '@/components/Rodape';
import { supabase, supabaseConfigurado } from '@/lib/supabase';

export default function Autenticar() {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'parado' | 'enviando' | 'enviado' | 'erro'>('parado');
  const [mensagem, setMensagem] = useState('');

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEstado('enviando');

    if (!supabase) {
      setEstado('erro');
      setMensagem('Login indisponível: as variáveis do Supabase não estão configuradas neste ambiente.');
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/conta` },
    });

    if (error) {
      setEstado('erro');
      setMensagem(error.message);
      return;
    }
    setEstado('enviado');
  }

  return (
    <>
      <Cabecalho />
      <main className="bg-tinta-5">
        <div className="container-app flex min-h-[70vh] max-w-md flex-col justify-center py-16">
          <div className="cartao p-8">
            <h1 className="text-2xl font-extrabold tracking-tight">Entrar na Plano Limpo</h1>
            <p className="mt-2 text-sm text-tinta-50">
              Sem senha para decorar: enviamos um link de acesso para o seu e-mail.
            </p>

            {estado === 'enviado' ? (
              <div className="mt-6 rounded-xl bg-verde-50 p-5 text-sm text-verde-700">
                <b className="block">Link enviado.</b>
                Abra o e-mail que mandamos para <b>{email}</b> e clique no link para entrar.
              </div>
            ) : (
              <form onSubmit={entrar} className="mt-6 flex flex-col gap-3">
                <input
                  type="email"
                  required
                  className="campo"
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="E-mail"
                />
                <button className="btn-primario w-full" disabled={estado === 'enviando'}>
                  {estado === 'enviando' ? 'Enviando…' : 'Receber link de acesso'}
                </button>
                {estado === 'erro' && (
                  <p className="rounded-lg bg-vermelho-50 px-4 py-3 text-sm text-vermelho-700">{mensagem}</p>
                )}
                {!supabaseConfigurado && (
                  <p className="rounded-lg bg-amarelo-50 px-4 py-3 text-xs text-amarelo-700">
                    Ambiente sem Supabase configurado — o login fica indisponível, mas o funil de
                    contratação funciona normalmente.
                  </p>
                )}
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-tinta-50">
            É profissional?{' '}
            <Link href="/profissional" className="font-semibold text-azul-600">
              Cadastre-se para atender
            </Link>
          </p>
        </div>
      </main>
      <Rodape />
    </>
  );
}
