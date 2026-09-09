'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SERVICOS } from '@/lib/catalogo';
import { IconeServico, type TipoIcone } from './Marca';

export function GradeServicos() {
  const [publico, setPublico] = useState<'lar' | 'empresa'>('lar');

  const lista =
    publico === 'lar'
      ? SERVICOS.filter((s) => s.publico === 'lar')
      : SERVICOS.filter((s) => s.publico === 'empresa' || s.code === 'FURNITURE_ASSEMBLY');

  return (
    <section id="servicos" className="scroll-mt-20">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight">O que você precisa?</h2>
        <div className="inline-flex rounded-full border border-tinta-10 p-1" role="tablist">
          {(['lar', 'empresa'] as const).map((chave) => (
            <button
              key={chave}
              role="tab"
              aria-selected={publico === chave}
              onClick={() => setPublico(chave)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                publico === chave ? 'bg-tinta-solida text-white' : 'text-tinta-50 hover:text-tinta'
              }`}
            >
              {chave === 'lar' ? 'Para o lar' : 'Para a empresa'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((s) => (
          <Link
            key={s.slug}
            href={`/cliente/contratar/${s.slug}`}
            className="cartao flex items-center gap-4 p-4 transition hover:border-tinta-20"
          >
            <IconeServico tipo={s.slug as TipoIcone} />
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-tight">{s.nome}</p>
              <p className="truncate text-sm text-tinta-50">{s.chamada}</p>
            </div>
            <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-tinta-30" aria-hidden="true">
              <path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
