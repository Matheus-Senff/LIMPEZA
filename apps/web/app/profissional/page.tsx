'use client';

import { useEffect, useState } from 'react';
import { usePerfil } from '@/lib/usePerfil';
import { supabase } from '@/lib/supabase';
import { horas, reais } from '@/lib/catalogo';

interface DadosProfissional {
  accreditation_status: 'pending' | 'in_review' | 'approved' | 'suspended' | 'blocked';
  rating_avg: number;
  rating_count: number;
  completed_orders: number;
}

interface Pedido {
  id: string;
  code: string;
  service: string;
  scheduled_at: string;
  minutes: number;
  status: string;
  payout_cents: number;
}

const STATUS_CREDENCIAMENTO: Record<DadosProfissional['accreditation_status'], string> = {
  pending: 'Cadastro em análise',
  in_review: 'Documentos em verificação',
  approved: 'Aprovado',
  suspended: 'Suspenso',
  blocked: 'Bloqueado',
};

export default function ProfissionalHome() {
  const perfil = usePerfil();
  const [dados, setDados] = useState<DadosProfissional | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setCarregando(false);
        return;
      }
      const [prof, ord] = await Promise.all([
        supabase
          .from('professionals')
          .select('accreditation_status, rating_avg, rating_count, completed_orders')
          .eq('id', perfil.id)
          .maybeSingle(),
        supabase
          .from('orders')
          .select('id, code, service, scheduled_at, minutes, status, payout_cents')
          .order('scheduled_at', { ascending: true })
          .limit(20),
      ]);
      setDados((prof.data as DadosProfissional) ?? null);
      setPedidos(ord.data ?? []);
      setCarregando(false);
    })();
  }, [perfil.id]);

  const primeiroNome = perfil.full_name.split(' ')[0];
  const aprovado = dados?.accreditation_status === 'approved';

  return (
    <main className="container-app flex flex-col gap-8 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Olá, {primeiroNome}</h1>

      {!carregando && dados && !aprovado && (
        <div className="cartao p-5">
          <p className="font-bold">{STATUS_CREDENCIAMENTO[dados.accreditation_status]}</p>
          <p className="mt-1 text-sm text-tinta-50">
            Assim que seu cadastro for aprovado, você passa a receber pedidos por aqui.
          </p>
        </div>
      )}

      {!carregando && dados && aprovado && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="cartao p-5">
            <p className="rotulo">Nota</p>
            <p className="text-2xl font-bold numero">{dados.rating_avg.toFixed(2)}</p>
          </div>
          <div className="cartao p-5">
            <p className="rotulo">Avaliações</p>
            <p className="text-2xl font-bold numero">{dados.rating_count}</p>
          </div>
          <div className="cartao p-5">
            <p className="rotulo">Serviços concluídos</p>
            <p className="text-2xl font-bold numero">{dados.completed_orders}</p>
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight">Seus pedidos</h2>
        {carregando ? (
          <p className="text-sm text-tinta-50">Carregando…</p>
        ) : pedidos.length === 0 ? (
          <div className="cartao p-8 text-center">
            <p className="font-semibold">Nenhum pedido no momento</p>
            <p className="mt-1 text-sm text-tinta-50">Pedidos atribuídos a você aparecem aqui.</p>
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
                <span className="rounded-full bg-tinta-5 px-3 py-1 text-xs font-bold text-tinta-70">{p.status}</span>
                <span className="font-bold text-verde-700 numero">{reais(p.payout_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
