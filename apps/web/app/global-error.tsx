'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
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
        </div>
      </body>
    </html>
  );
}
