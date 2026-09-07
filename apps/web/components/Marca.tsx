import Link from 'next/link';

export function Logo({ compacto = false, invertido = false }: { compacto?: boolean; invertido?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Plano Limpo, página inicial">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-degrade">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!compacto && (
        <span className={`text-[19px] font-extrabold tracking-tight ${invertido ? 'text-white' : 'text-tinta'}`}>
          Plano<span className="texto-degrade">Limpo</span>
        </span>
      )}
    </Link>
  );
}

export type TipoIcone =
  | 'padrao'
  | 'pesada'
  | 'passar-roupa'
  | 'montagem-de-moveis'
  | 'pre-mudanca'
  | 'pos-obra'
  | 'comercial'
  | 'assistencia';

const CAMINHOS: Record<TipoIcone, string> = {
  padrao: 'M4 12l3-7h10l3 7M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M4 12h16M9 20v-5h6v5',
  pesada: 'M5 9h14l-1.5 11h-11L5 9zM9 9V6a3 3 0 016 0v3',
  'passar-roupa': 'M4 20h16M6 20c0-5 2-9 8-9 3 0 5 2 5-1M8 8l3-3 3 3',
  'montagem-de-moveis': 'M6 4h12v16H6zM6 10h12M10 4v6M15 15l4 4m0-4l-4 4',
  'pre-mudanca': 'M3 11l9-7 9 7M6 10v10h12V10M10 20v-6h4v6',
  'pos-obra': 'M4 20h16M6 20V9l6-5 6 5v11M10 20v-5h4v5',
  comercial: 'M4 21V7l6-4 6 4v14M4 21h16M9 10h2m2 0h2M9 14h2m2 0h2M10 21v-4h4v4',
  assistencia: 'M14.7 6.3a4 4 0 015.7 5.6l-8 8-3-1-1-3z',
};

export function Icone({ tipo, className = 'h-6 w-6' }: { tipo: TipoIcone; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={CAMINHOS[tipo]} />
    </svg>
  );
}

export function IconeServico({ tipo, className = '' }: { tipo: TipoIcone; className?: string }) {
  return (
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-tinta-5 text-tinta ${className}`}>
      <Icone tipo={tipo} />
    </span>
  );
}
