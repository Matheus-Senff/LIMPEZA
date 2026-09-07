'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from './Marca';
import { supabase } from '@/lib/supabase';

const NAV: Record<'customer' | 'professional' | 'admin', { href: string; rotulo: string }[]> = {
  customer: [
    { href: '/cliente', rotulo: 'Serviços' },
    { href: '/cliente#pedidos', rotulo: 'Meus pedidos' },
  ],
  professional: [{ href: '/profissional', rotulo: 'Painel' }],
  admin: [{ href: '/admin', rotulo: 'Backoffice' }],
};

export function CabecalhoApp({ papel }: { papel: 'customer' | 'professional' | 'admin' }) {
  const router = useRouter();

  async function sair() {
    await supabase?.auth.signOut();
    router.replace('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-tinta-10 bg-white/95 backdrop-blur">
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
        <button onClick={sair} className="text-sm font-semibold text-tinta-50 hover:text-tinta">
          Sair
        </button>
      </div>
    </header>
  );
}
