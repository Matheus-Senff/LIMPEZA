import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Cabecalho } from '@/components/Cabecalho';
import { Rodape } from '@/components/Rodape';
import { Funil } from '@/components/Funil';
import { SERVICOS, porSlug } from '@/lib/catalogo';

export function generateStaticParams() {
  return SERVICOS.map((s) => ({ servico: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ servico: string }>;
}): Promise<Metadata> {
  const { servico } = await params;
  const s = porSlug(servico);
  if (!s) return { title: 'Serviço não encontrado' };
  return {
    title: `${s.nome} — contrate em 1 minuto`,
    description: s.chamada,
  };
}

export default async function ContratarPage({
  params,
  searchParams,
}: {
  params: Promise<{ servico: string }>;
  searchParams: Promise<{ frequency?: string }>;
}) {
  const { servico } = await params;
  const { frequency } = await searchParams;
  const s = porSlug(servico);
  if (!s) notFound();

  return (
    <>
      <Cabecalho />
      <main className="bg-tinta-5 pb-10">
        <div className="border-b border-tinta-20 bg-white">
          <div className="container-app flex justify-end py-4">
            <p className="text-xs font-semibold text-tinta-50">
              Pagamento no Pix ou cartão · Cancelamento grátis até 24h antes
            </p>
          </div>
        </div>
        <Funil servico={s} frequenciaInicial={frequency} />
      </main>
      <Rodape />
    </>
  );
}
