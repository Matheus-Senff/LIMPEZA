'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CORES, SERVICOS } from '@/lib/catalogo';
import { Ilustracao } from './Marca';

export function GradeServicos() {
  const [publico, setPublico] = useState<'lar' | 'empresa'>('lar');

  const lista =
    publico === 'lar'
      ? SERVICOS.filter((s) => s.publico === 'lar')
      : SERVICOS.filter((s) => s.publico === 'empresa' || s.code === 'FURNITURE_ASSEMBLY');

  return (
    <section id="servicos" className="container-app scroll-mt-20 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="rotulo mb-2 text-azul-600">Escolha o serviço</p>
          <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            O que você precisa resolver hoje?
          </h2>
        </div>
        <div className="inline-flex rounded-full border border-tinta-20 bg-white p-1" role="tablist">
          {(['lar', 'empresa'] as const).map((chave) => (
            <button
              key={chave}
              role="tab"
              aria-selected={publico === chave}
              onClick={() => setPublico(chave)}
              className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wide transition ${
                publico === chave ? 'bg-azul-600 text-white' : 'text-tinta-50 hover:text-tinta'
              }`}
            >
              {chave === 'lar' ? 'Para o seu lar' : 'Para sua empresa'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((s) => {
          const cor = CORES[s.cor];
          return (
            <article key={s.slug} className="cartao group flex flex-col overflow-hidden">
              <div className="h-36 overflow-hidden">
                <Ilustracao tipo={s.slug} className="transition duration-500 group-hover:scale-105" />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold leading-tight">{s.nome}</h3>
                  {s.trazProdutos && (
                    <span className="shrink-0 rounded-full bg-amarelo-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-tinta">
                      Inclui produtos
                    </span>
                  )}
                </div>
                <p className="flex-1 text-sm text-tinta-50">{s.chamada}</p>
                <div className={`inline-flex w-fit items-center gap-1.5 rounded-full ${cor.bg} px-3 py-1 text-xs font-bold ${cor.texto}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cor.solido}`} />
                  Disponível para {s.disponibilidade === 'hoje' ? 'hoje' : 'amanhã'}
                </div>
                <Link href={`/contratar/${s.slug}`} className="btn-contorno mt-1 w-full !py-2.5 !text-xs">
                  {s.code === 'HOME_ASSISTANCE' ? 'Saiba mais' : 'Agendar serviço'}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
