import Link from 'next/link';

export function Logo({ compacto = false, invertido = false }: { compacto?: boolean; invertido?: boolean }) {
  const conteudo = (
    <>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-tinta-solida">
        <MarcaVan className="h-[22px] w-[22px]" />
      </span>
      {!compacto && (
        <span className={`text-[19px] font-extrabold tracking-tight ${invertido ? 'text-white' : 'text-tinta'}`}>
          Plano<span className="texto-degrade">Limpo</span>
        </span>
      )}
    </>
  );

  // Dentro do app (cabeçalho logado) a logo é só identidade visual — não
  // deve navegar pra lugar nenhum. Um clique ali batendo em "/" e voltando
  // sozinho (o login redireciona quem já tem sessão) não tem função
  // nenhuma, só confunde e é uma navegação a mais que não precisa existir.
  if (compacto) {
    return <span className="inline-flex items-center gap-2.5" aria-label="Plano Limpo">{conteudo}</span>;
  }

  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Plano Limpo, página inicial">
      {conteudo}
    </Link>
  );
}

/** Van de limpeza com vassoura e balde — ícone da marca, sobre fundo escuro. */
function MarcaVan({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M2.5 15.5V9.8a1 1 0 011-1h9l4 4v2.7"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2.5 15.5h13.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="5.2" y="10.3" width="4" height="3" rx=".5" fill="#fff" opacity=".9" />
      <circle cx="6.5" cy="16.2" r="1.4" fill="#fff" />
      <circle cx="13.5" cy="16.2" r="1.4" fill="#fff" />
      <path d="M18.4 16.2h1.4l-.5-4.2a1 1 0 00-1-.9h-1.9a1 1 0 00-1 .9l-.5 4.2z" fill="#10b981" />
      <path d="M15.4 12.1c0-1.3 3.5-1.3 3.5 0" fill="none" stroke="#10b981" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M17 9.6l2.3-3.9" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M19 5.9l1.5-.9.6 1.3-1.6.6z" fill="#fff" />
    </svg>
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
