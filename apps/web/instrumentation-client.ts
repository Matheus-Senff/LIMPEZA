import * as Sentry from '@sentry/nextjs';

// Só ativa se houver DSN público configurado — sem ele, nada é inicializado
// e nenhum dado sai do navegador.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
