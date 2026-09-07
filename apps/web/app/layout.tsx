import type { Metadata } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--fonte-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Plano Limpo — faxina, passadoria e serviços domésticos',
    template: '%s · Plano Limpo',
  },
  description:
    'Agende faxina, limpeza pesada, passadoria e montagem de móveis com profissionais credenciados e segurados. Preço transparente, do primeiro passo ao pagamento.',
  metadataBase: new URL('https://plano-limpo.vercel.app'),
  openGraph: {
    title: 'Plano Limpo',
    description: 'Serviços domésticos com preço transparente e profissionais segurados.',
    type: 'website',
    locale: 'pt_BR',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={figtree.variable}>
      <body>{children}</body>
    </html>
  );
}
