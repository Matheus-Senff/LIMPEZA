'use client';

import { useEffect } from 'react';

export function Modal({
  titulo,
  onFechar,
  children,
  largo,
  extraLargo,
}: {
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
  /** ~40% mais largo que o padrão — pra conteúdo com mais informação, tipo o passo a passo de uma oferta. */
  largo?: boolean;
  /** ~70% mais largo que o padrão — pra conteúdo bem mais denso, tipo um chamado de suporte com histórico. */
  extraLargo?: boolean;
}) {
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar();
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center bg-tinta/40 p-4" onClick={onFechar}>
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-card bg-superficie p-6 shadow-cartao ${
          extraLargo ? 'max-w-[54.4rem]' : largo ? 'max-w-[44.8rem]' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold tracking-tight">{titulo}</h2>
          <button
            onClick={onFechar}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-tinta-50 hover:bg-tinta-5 hover:text-tinta"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
