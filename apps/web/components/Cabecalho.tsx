'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from './Marca';
import { SERVICOS } from '@/lib/catalogo';

export function Cabecalho() {
  const [aberto, setAberto] = useState<'lar' | 'empresa' | null>(null);
  const [menuMobile, setMenuMobile] = useState(false);

  const doLar = SERVICOS.filter((s) => s.publico === 'lar');
  const daEmpresa = SERVICOS.filter((s) => s.publico === 'empresa').concat(
    SERVICOS.filter((s) => s.code === 'FURNITURE_ASSEMBLY'),
  );

  const Dropdown = ({ chave, itens }: { chave: 'lar' | 'empresa'; itens: typeof SERVICOS }) => (
    <div
      className="relative"
      onMouseEnter={() => setAberto(chave)}
      onMouseLeave={() => setAberto(null)}
    >
      <button
        className="flex items-center gap-1.5 py-2 text-sm font-semibold text-tinta-70 transition hover:text-azul-600"
        onClick={() => setAberto(aberto === chave ? null : chave)}
        aria-expanded={aberto === chave}
      >
        {chave === 'lar' ? 'Meu Lar' : 'Minha Empresa'}
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {aberto === chave && (
        <div className="absolute left-0 top-full z-50 w-64 animate-entrada rounded-card border border-tinta-20 bg-white p-2 shadow-flutuante">
          {itens.map((s) => (
            <Link
              key={s.slug}
              href={`/contratar/${s.slug}`}
              className="block rounded-lg px-3 py-2 text-sm text-tinta-70 transition hover:bg-tinta-5 hover:text-azul-600"
            >
              {s.nome}
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-tinta-20 bg-white/95 backdrop-blur">
      <div className="container-app flex h-16 items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            <Dropdown chave="lar" itens={doLar} />
            <Dropdown chave="empresa" itens={daEmpresa} />
            <Link href="/profissional" className="py-2 text-sm font-semibold text-tinta-70 transition hover:text-azul-600">
              Trabalhe no App
            </Link>
            <Link href="/conta" className="py-2 text-sm font-semibold text-tinta-70 transition hover:text-azul-600">
              Minha conta
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/autenticar" className="hidden text-sm font-bold text-azul-600 sm:inline">
            Entrar
          </Link>
          <Link href="/contratar/padrao" className="btn-primario !px-5 !py-2.5 !text-xs">
            Agendar serviço
          </Link>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-tinta-20 md:hidden"
            onClick={() => setMenuMobile((v) => !v)}
            aria-label="Abrir menu"
            aria-expanded={menuMobile}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {menuMobile && (
        <div className="animate-entrada border-t border-tinta-20 bg-white px-5 py-3 md:hidden">
          {SERVICOS.map((s) => (
            <Link
              key={s.slug}
              href={`/contratar/${s.slug}`}
              className="block py-2 text-sm text-tinta-70"
              onClick={() => setMenuMobile(false)}
            >
              {s.nome}
            </Link>
          ))}
          <div className="mt-2 flex gap-4 border-t border-tinta-20 pt-3 text-sm font-semibold">
            <Link href="/profissional">Trabalhe no App</Link>
            <Link href="/conta">Minha conta</Link>
            <Link href="/autenticar" className="text-azul-600">Entrar</Link>
          </div>
        </div>
      )}
    </header>
  );
}
