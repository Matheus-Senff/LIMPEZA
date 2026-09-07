'use client';

import { useEffect, useState } from 'react';
import { usePerfil } from '@/lib/usePerfil';
import { supabase } from '@/lib/supabase';
import { GradeServicos } from '@/components/GradeServicos';
import { horas, reais } from '@/lib/catalogo';

interface Pedido {
  id: string;
  code: string;
  service: string;
  scheduled_at: string;
  minutes: number;
  status: string;
  price_cents: number;
}

const STATUS: Record<string, string> = {
  searching_professional: 'Procurando profissional',
  assigned: 'Profissional confirmado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  rated: 'Avaliado',
  cancelled_by_customer: 'Cancelado',
};

export default function ClienteHome() {
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
        .select('id, code, service, scheduled_at, minutes, status, price_cents')
        .order('scheduled_at', { ascending: true })
        .limit(20);
      setPedidos(data ?? []);
      setCarregando(false);
    })();
  }, []);

  const primeiroNome = perfil.full_name.split(' ')[0];

  return (
    <main className="container-app flex flex-col gap-10 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Olá, {primeiroNome}</h1>

      <GradeServicos />

      <section id="pedidos" className="scroll-mt-20">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Meus pedidos</h2>
        {carregando ? (
          <p className="text-sm text-tinta-50">Carregando…</p>
        ) : pedidos.length === 0 ? (
          <div className="cartao p-8 text-center">
            <p className="font-semibold">Nenhum serviço agendado</p>
            <p className="mt-1 text-sm text-tinta-50">Escolha um serviço acima para começar.</p>
          </div>
        ) : (
          <ul className="cartao flex flex-col divide-y divide-tinta-10 p-2">
            {pedidos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
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
                <span className="font-bold text-verde-700 numero">{reais(p.price_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
