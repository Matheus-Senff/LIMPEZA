'use client';

import { use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePerfil } from '@/lib/usePerfil';
import { Funil } from '@/components/Funil';
import { useCatalogo } from '@/lib/useCatalogo';

export default function ContratarPage({ params }: { params: Promise<{ servico: string }> }) {
  const { servico: slug } = use(params);
  const searchParams = useSearchParams();
  const perfil = usePerfil();
  const { servicos, carregando } = useCatalogo();
  const servico = servicos.find((s) => s.slug === slug);

  if (carregando && !servico) return null;

  if (!servico) {
    return (
      <main className="container-app py-16 text-center">
        <p className="font-bold">Serviço não encontrado.</p>
        <Link href="/cliente" className="mt-4 inline-block text-sm font-semibold text-tinta">
          Voltar
        </Link>
      </main>
    );
  }

  return (
    <main>
      <Funil
        servico={servico}
        frequenciaInicial={searchParams.get('frequency') ?? undefined}
        perfil={{ id: perfil.id, nome: perfil.full_name, email: perfil.email, telefone: perfil.phone ?? '' }}
      />
    </main>
  );
}
