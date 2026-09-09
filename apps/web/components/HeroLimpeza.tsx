/**
 * Ilustração da tela de login: van de limpeza estacionada, uma pessoa
 * correndo com vassoura e balde rumo à casa — só decorativa, sem texto
 * nem interação. Paleta escura (tinta) + acentos azul/verde da marca.
 */
export function HeroLimpeza({ className = 'h-40 w-full max-w-xs' }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 160" className={className} aria-hidden="true">
      {/* chão */}
      <path d="M0 138h320" stroke="#d8dbe0" strokeWidth="2" />

      {/* casa */}
      <g transform="translate(230 58)">
        <path d="M0 80V38l35-26 35 26v42z" fill="#eceef1" stroke="#111214" strokeWidth="3" strokeLinejoin="round" />
        <path d="M-6 42L35 8l41 34" fill="none" stroke="#111214" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="27" y="50" width="16" height="30" rx="1.5" fill="#111214" />
        <rect x="8" y="46" width="14" height="14" rx="1.5" fill="#fff" stroke="#111214" strokeWidth="2.5" />
        <rect x="48" y="46" width="14" height="14" rx="1.5" fill="#fff" stroke="#111214" strokeWidth="2.5" />
      </g>

      {/* van */}
      <g transform="translate(8 66)">
        <path
          d="M2 56V22a4 4 0 014-4h60l26 20v18z"
          fill="#111214"
          stroke="#111214"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M70 18l22 20H70z" fill="#3b82f6" />
        <rect x="10" y="26" width="22" height="16" rx="2" fill="#f6f7f9" />
        <path d="M2 56h90" stroke="#111214" strokeWidth="3" />
        <circle cx="22" cy="58" r="9" fill="#111214" />
        <circle cx="22" cy="58" r="3.4" fill="#f6f7f9" />
        <circle cx="76" cy="58" r="9" fill="#111214" />
        <circle cx="76" cy="58" r="3.4" fill="#f6f7f9" />
        <text x="46" y="40" fontSize="11" fontWeight="800" fill="#10b981" fontFamily="sans-serif">
          PL
        </text>
      </g>

      {/* balde */}
      <g transform="translate(140 108)">
        <path d="M2 6h26l-3 22a3 3 0 01-3 2.6H8a3 3 0 01-3-2.6z" fill="#10b981" stroke="#111214" strokeWidth="2.5" />
        <path d="M4 6c0-6 22-6 22 0" fill="none" stroke="#111214" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* pessoa correndo com vassoura, rumo à casa */}
      <g transform="translate(178 78)">
        <circle cx="10" cy="6" r="6.5" fill="#111214" />
        <path
          d="M10 13c-6 0-9 5-9 10l7 2-2 15h9l3-13 6 11h8l-8-19c-1-4-4-6-8-6z"
          fill="#3b82f6"
        />
        <path d="M-2 20l-9 6" stroke="#111214" strokeWidth="3" strokeLinecap="round" />
        <path d="M17 15l11-9" stroke="#a1622e" strokeWidth="3" strokeLinecap="round" />
        <path d="M27 5l6-4 2 4-6 4z" fill="#d8dbe0" stroke="#111214" strokeWidth="1.5" />
        <path d="M8 30l-5 12" stroke="#111214" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M18 30l6 12" stroke="#111214" strokeWidth="3.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
