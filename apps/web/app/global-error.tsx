'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    import('@sentry/nextjs').then((Sentry) => Sentry.captureException(error));
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <h1>Algo deu errado</h1>
          <p>Tente novamente em instantes.</p>
          {/* Sem estes dois, a tela de erro global vira beco sem saída: não
              há cabeçalho nem menu para sair dela. */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              onClick={reset}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: 0,
                background: '#111214',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Tentar de novo
            </button>
            <a
              href="/"
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: '1px solid #d4d4d8',
                color: '#111214',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Voltar ao início
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
