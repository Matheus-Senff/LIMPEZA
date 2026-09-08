'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/Marca';
import { supabase, supabaseConfigurado } from '@/lib/supabase';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!supabase) {
      setErro('Indisponível: Supabase não está configurado neste ambiente.');
      return;
    }
    setCarregando(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setCarregando(false);
    setEnviado(true);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-tinta-5 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="cartao p-7">
          <h1 className="text-xl font-bold tracking-tight">Recuperar senha</h1>

          {enviado ? (
            <p className="mt-3 text-sm text-tinta-50">
              Se esse e-mail tiver uma conta, enviamos um link pra você criar uma senha nova.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-tinta-50">Informe seu e-mail pra receber o link.</p>
              <form onSubmit={enviar} className="mt-6 flex flex-col gap-3">
                <input
                  type="email"
                  required
                  className="campo"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="E-mail"
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
                  {carregando ? 'Enviando…' : 'Enviar link'}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-tinta-50">
          <Link href="/" className="font-semibold text-tinta">
            Voltar pro login
          </Link>
        </p>
      </div>
    </main>
  );
}
