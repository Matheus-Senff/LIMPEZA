'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePerfil } from '@/lib/usePerfil';
import { supabase } from '@/lib/supabase';
import { horas, reais } from '@/lib/catalogo';

interface Pedido {
  id: string;
  code: string;
  service: string;
  scheduled_at: string;
  minutes: number;
  status: string;
  payout_cents: number;
}

const STATUS: Record<string, string> = {
  assigned: 'Confirmado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  rated: 'Avaliado',
  cancelled_by_customer: 'Cancelado pelo cliente',
};

export default function MeusPedidosProfissional() {
  const perfil = usePerfil();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setCarregando(false);
        return;
      }
      const { data } = await supabase
        .from('orders')
        .select('id, code, service, scheduled_at, minutes, status, payout_cents')
        .eq('professional_id', perfil.id)
        .order('scheduled_at', { ascending: true })
        .limit(20);
      setPedidos(data ?? []);
      setCarregando(false);
    })();
  }, [perfil.id]);

  return (
    <main className="container-app flex flex-col gap-10 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Meus pedidos</h1>

      {carregando ? (
        <p className="text-sm text-tinta-50">Carregando…</p>
      ) : pedidos.length === 0 ? (
        <div className="cartao p-8 text-center">
          <p className="font-semibold">Nenhum pedido no momento</p>
          <p className="mt-1 text-sm text-tinta-50">
            Vá em{' '}
            <Link href="/profissional" className="font-semibold text-azul-600">
              Serviços
            </Link>{' '}
            para ver ofertas disponíveis.
          </p>
        </div>
      ) : (
        <div className="cartao flex flex-col divide-y divide-tinta-10 p-2">
          {pedidos.map((p) => (
            <Link
              key={p.id}
              href={`/profissional/pedidos/${p.id}`}
              className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-tinta-5"
            >
              <div>
                <p className="font-bold numero">
                  {new Date(p.scheduled_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-xs text-tinta-50 numero">
                  #{p.code} · {horas(p.minutes)}
                </p>
              </div>
              <span className="rounded-full bg-tinta-5 px-3 py-1 text-xs font-bold text-tinta-70">
                {STATUS[p.status] ?? p.status}
              </span>
              <span className="font-bold text-verde-700 numero">{reais(p.payout_cents)}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
