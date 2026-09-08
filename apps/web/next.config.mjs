import { withSentryConfig } from '@sentry/nextjs/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Slot pronto para trocar as ilustrações por fotos reais depois.
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
};

// Sem SENTRY_DSN configurado, o SDK fica inerte (ver sentry.*.config.ts) —
// aqui só desligamos upload de sourcemaps e telemetria, que exigem um
// auth token que este projeto não tem.
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: true },
  webpack: { treeshake: { removeDebugLogging: true } },
});
