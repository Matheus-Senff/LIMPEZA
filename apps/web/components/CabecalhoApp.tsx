'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from './Marca';
import { supabase } from '@/lib/supabase';
import { AlternarTema } from './AlternarTema';
import { buscarPapeis, buscarPerfil } from '@/lib/perfil';

const NAV: Record<'customer' | 'professional' | 'admin', { href: string; rotulo: string }[]> = {
  customer: [
    { href: '/cliente', rotulo: 'Serviços' },
    { href: '/cliente/pedidos', rotulo: 'Meus pedidos' },
    { href: '/cliente/conta', rotulo: 'Minha conta' },
  ],
  professional: [
    { href: '/profissional', rotulo: 'Buscar' },
    { href: '/profissional/pedidos', rotulo: 'Painel de serviços' },
    { href: '/profissional/conta', rotulo: 'Minha conta' },
  ],
  admin: [{ href: '/admin', rotulo: 'Backoffice' }],
};

export function CabecalhoApp({ papel }: { papel: 'customer' | 'professional' | 'admin' }) {
  const router = useRouter();
  const [temAmbos, setTemAmbos] = useState(false);

  // "Trocar" só existe pra quem tem cadastro de cliente E de profissional —
  // quem é só um dos dois não tem pra onde alternar.
  useEffect(() => {
    (async () => {
      if (papel === 'admin') return;
      const perfil = await buscarPerfil();
      if (!perfil) return;
      const papeis = await buscarPapeis(perfil.id);
      setTemAmbos(papeis.cliente && papeis.profissional);
    })();
  }, [papel]);

  async function sair() {
    await supabase?.auth.signOut();
    router.replace('/');
  }

  function trocar() {
    router.replace(papel === 'customer' ? '/profissional' : '/cliente');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-tinta-10 bg-superficie/95 backdrop-blur">
      <div className="container-app flex h-16 items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Logo compacto />
          <nav className="hidden items-center gap-6 sm:flex">
            {NAV[papel].map((item) => (
              <Link key={item.href} href={item.href} className="text-sm font-semibold text-tinta-70 transition hover:text-tinta">
                {item.rotulo}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex h-10 items-center gap-2">
          {temAmbos && (
            <button
              onClick={trocar}
              className="flex h-9 items-center rounded-full border border-tinta-20 px-3 text-sm font-semibold leading-none text-tinta-70 transition hover:border-tinta-30 hover:text-tinta"
            >
              Trocar
            </button>
          )}
          <button
            onClick={sair}
            className="flex h-9 items-center rounded-full px-3 text-sm font-semibold leading-none text-tinta-50 transition hover:text-tinta"
          >
            Sair
          </button>
          <AlternarTema />
        </div>
      </div>

      {/* No celular o menu de cima não cabe ao lado da logo: vira uma linha
          rolável embaixo, em vez de sumir e deixar a pessoa sem navegação. */}
      <nav className="container-app -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 sem-barra sm:hidden">
        {NAV[papel].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-full bg-tinta-5 px-4 py-1.5 text-sm font-semibold text-tinta-70"
          >
            {item.rotulo}
          </Link>
        ))}
      </nav>
    </header>
  );
}
