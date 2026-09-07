import Link from 'next/link';

export function Logo({ compacto = false, invertido = false }: { compacto?: boolean; invertido?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Plano Limpo, página inicial">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-azul-600">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amarelo-400" />
      </span>
      {!compacto && (
        <span className={`text-[19px] font-extrabold tracking-tight ${invertido ? 'text-white' : 'text-tinta'}`}>
          Plano<span className="text-azul-600">Limpo</span>
        </span>
      )}
    </Link>
  );
}

/**
 * Ilustrações originais, uma por serviço. Vetor em vez de banco de imagens:
 * carrega instantâneo, acompanha a paleta e não tem licença para gerenciar.
 * Para trocar por foto, basta apontar <Image src="/images/..."> no lugar.
 */
export function Ilustracao({ tipo, className = '' }: { tipo: string; className?: string }) {
  const comum = { className: `h-full w-full ${className}`, viewBox: '0 0 200 140', 'aria-hidden': true } as const;

  switch (tipo) {
    case 'padrao':
      return (
        <svg {...comum}>
          <rect width="200" height="140" fill="#eef3ff" />
          <circle cx="152" cy="34" r="26" fill="#dbe6ff" />
          <rect x="28" y="86" width="144" height="8" rx="4" fill="#bdd0ff" />
          <rect x="62" y="40" width="34" height="50" rx="6" fill="#1546c8" />
          <rect x="70" y="26" width="18" height="18" rx="4" fill="#f5c518" />
          <rect x="76" y="14" width="6" height="16" rx="3" fill="#101114" />
          <path d="M112 90V54c0-6 4-10 10-10s10 4 10 10v36" fill="none" stroke="#12a660" strokeWidth="5" strokeLinecap="round" />
          <circle cx="122" cy="44" r="7" fill="#12a660" />
        </svg>
      );
    case 'pesada':
      return (
        <svg {...comum}>
          <rect width="200" height="140" fill="#e9f8f0" />
          <path d="M0 108h200v32H0z" fill="#c9efdd" />
          <rect x="34" y="44" width="46" height="64" rx="8" fill="#0e8a4f" />
          <rect x="44" y="30" width="26" height="16" rx="6" fill="#f5c518" />
          <circle cx="57" cy="72" r="9" fill="#e9f8f0" />
          <rect x="100" y="62" width="60" height="46" rx="8" fill="#1546c8" />
          <rect x="112" y="50" width="36" height="14" rx="7" fill="#dbe6ff" />
          <path d="M108 84h44" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'passar-roupa':
      return (
        <svg {...comum}>
          <rect width="200" height="140" fill="#fff8e1" />
          <rect x="24" y="76" width="152" height="10" rx="5" fill="#ffefb8" />
          <path d="M60 76V66c0-10 8-18 18-18h40c10 0 18 8 18 18v10z" fill="#e0ae00" />
          <rect x="52" y="76" width="96" height="14" rx="7" fill="#101114" />
          <path d="M104 40c8-6 8-14 0-20" fill="none" stroke="#d62b2b" strokeWidth="4" strokeLinecap="round" />
          <path d="M120 44c8-6 8-14 0-20" fill="none" stroke="#d62b2b" strokeWidth="4" strokeLinecap="round" opacity=".55" />
          <rect x="34" y="100" width="60" height="26" rx="6" fill="#1546c8" />
        </svg>
      );
    case 'montagem-de-moveis':
      return (
        <svg {...comum}>
          <rect width="200" height="140" fill="#fdecec" />
          <rect x="46" y="46" width="108" height="70" rx="8" fill="#d62b2b" />
          <rect x="56" y="56" width="40" height="50" rx="4" fill="#fdecec" />
          <rect x="104" y="56" width="40" height="22" rx="4" fill="#fdecec" />
          <rect x="104" y="84" width="40" height="22" rx="4" fill="#fdecec" />
          <path d="M150 30l16 16-10 10-16-16z" fill="#101114" />
          <circle cx="140" cy="46" r="7" fill="#f5c518" />
        </svg>
      );
    case 'pre-mudanca':
      return (
        <svg {...comum}>
          <rect width="200" height="140" fill="#e9f8f0" />
          <path d="M100 26l58 42H42z" fill="#0e8a4f" />
          <rect x="60" y="66" width="80" height="50" rx="6" fill="#12a660" />
          <rect x="86" y="84" width="28" height="32" rx="4" fill="#e9f8f0" />
          <rect x="26" y="88" width="34" height="28" rx="4" fill="#1546c8" />
          <path d="M26 98h34" stroke="#dbe6ff" strokeWidth="4" />
        </svg>
      );
    case 'pos-obra':
      return (
        <svg {...comum}>
          <rect width="200" height="140" fill="#fff8e1" />
          <path d="M0 112h200v28H0z" fill="#ffefb8" />
          <path d="M62 112L92 40l30 72z" fill="#e0ae00" />
          <rect x="118" y="62" width="52" height="50" rx="6" fill="#101114" />
          <path d="M126 74h36M126 88h36M126 102h20" stroke="#fff8e1" strokeWidth="4" strokeLinecap="round" />
          <circle cx="46" cy="52" r="14" fill="#1546c8" />
        </svg>
      );
    case 'comercial':
      return (
        <svg {...comum}>
          <rect width="200" height="140" fill="#eef3ff" />
          <rect x="34" y="34" width="60" height="82" rx="6" fill="#1546c8" />
          <rect x="104" y="58" width="62" height="58" rx="6" fill="#2f6bea" />
          <g fill="#eef3ff">
            <rect x="44" y="46" width="16" height="14" rx="2" />
            <rect x="68" y="46" width="16" height="14" rx="2" />
            <rect x="44" y="70" width="16" height="14" rx="2" />
            <rect x="68" y="70" width="16" height="14" rx="2" />
            <rect x="114" y="70" width="18" height="14" rx="2" />
            <rect x="138" y="70" width="18" height="14" rx="2" />
          </g>
          <rect x="56" y="94" width="16" height="22" rx="2" fill="#f5c518" />
        </svg>
      );
    case 'assistencia':
      return (
        <svg {...comum}>
          <rect width="200" height="140" fill="#fdecec" />
          <circle cx="100" cy="70" r="42" fill="#fbd5d5" />
          <path d="M84 58l14-14a18 18 0 0124 24l-14 14" fill="none" stroke="#d62b2b" strokeWidth="7" strokeLinecap="round" />
          <path d="M76 96l22-22" stroke="#101114" strokeWidth="7" strokeLinecap="round" />
          <circle cx="140" cy="40" r="9" fill="#f5c518" />
        </svg>
      );
    case 'app':
      return (
        <svg {...comum} viewBox="0 0 200 200">
          <rect width="200" height="200" rx="24" fill="#eef3ff" />
          <rect x="58" y="22" width="84" height="156" rx="14" fill="#101114" />
          <rect x="64" y="34" width="72" height="132" rx="8" fill="#fff" />
          <rect x="72" y="46" width="56" height="10" rx="5" fill="#dbe6ff" />
          <rect x="72" y="64" width="56" height="34" rx="6" fill="#1546c8" />
          <rect x="72" y="106" width="26" height="26" rx="6" fill="#12a660" />
          <rect x="102" y="106" width="26" height="26" rx="6" fill="#f5c518" />
          <rect x="72" y="140" width="56" height="14" rx="7" fill="#d62b2b" />
        </svg>
      );
    default:
      return (
        <svg {...comum}>
          <rect width="200" height="140" fill="#f1f3f6" />
        </svg>
      );
  }
}
