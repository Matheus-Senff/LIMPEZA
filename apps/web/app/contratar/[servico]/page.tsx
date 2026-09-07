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
          <div className="container-app flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-verde-50 px-2.5 py-1 text-xs font-extrabold text-verde-700">4.8 ★</span>
              <p className="text-sm text-tinta-50">
                Mais de <b className="text-tinta">15 mil avaliações</b> de clientes reais
              </p>
            </div>
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
