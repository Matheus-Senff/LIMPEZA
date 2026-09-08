import * as Sentry from '@sentry/nextjs';

// Só ativa se houver DSN configurado — sem chave, o app roda normalmente
// e nada é enviado a lugar nenhum.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
