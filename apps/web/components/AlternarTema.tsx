'use client';

import { useEffect, useState } from 'react';
import { aplicarTema, lerTemaAtual, type Tema } from '@/lib/tema';

export function AlternarTema() {
  const [tema, setTema] = useState<Tema>('claro');

  useEffect(() => {
    setTema(lerTemaAtual());
  }, []);

  function alternar() {
    const novo: Tema = tema === 'claro' ? 'escuro' : 'claro';
    aplicarTema(novo);
    setTema(novo);
  }

  return (
    <button
      onClick={alternar}
      className="grid h-8 w-8 place-items-center rounded-full text-tinta-50 transition hover:bg-tinta-5 hover:text-tinta"
      aria-label={tema === 'claro' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      title={tema === 'claro' ? 'Modo escuro' : 'Modo claro'}
    >
      {tema === 'claro' ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55" />
        </svg>
      )}
    </button>
  );
}
