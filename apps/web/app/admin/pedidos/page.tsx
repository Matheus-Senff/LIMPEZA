'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { reais, porCodigo } from '@/lib/catalogo';
import { rotuloStatusPedido } from '@/lib/statusPedido';

interface PedidoAdmin {
  id: string;
  code: string;
  service: string;
  status: string;
  scheduled_at: string;
  created_at: string;
  price_cents: number;
  customer: { full_name: string } | null;
  professional: { full_name: string } | null;
}

// Mesma lista fixa usada em "Meus pedidos" do cliente e do profissional —
// aparece sempre, mesmo com 0 pedidos naquele status, pra dar consistência
// entre as três áreas.
const FILTROS_FIXOS = [
  'pending_payment',
  'searching_professional',
  'assigned',
  'in_progress',
  'completed',
  'rated',
  'cancelled_by_customer',
  'cancelled_by_professional',
  'no_show',
  'refunded',
];

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<PedidoAdmin[]>([]);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setCarregando(false);
        return;
      }
      const { data } = await supabase
        .from('orders')
        .select(
          'id, code, service, status, scheduled_at, created_at, price_cents, customer:customer_id(full_name), professional:professional_id(full_name)',
        )
        .order('created_at', { ascending: false })
        .limit(200);
      setPedidos((data as unknown as PedidoAdmin[]) ?? []);
      setCarregando(false);
    })();
  }, []);

  const statusFiltraveis = useMemo(() => {
    const extras = pedidos.map((p) => p.status).filter((s) => !FILTROS_FIXOS.includes(s));
    return [...FILTROS_FIXOS, ...Array.from(new Set(extras))];
  }, [pedidos]);
  const pedidosFiltrados = filtroStatus === 'todos' ? pedidos : pedidos.filter((p) => p.status === filtroStatus);

  return (
    <main className="bg-tinta-5 pb-16">
      <div className="container-app py-10">
        <p className="rotulo mb-1 text-tinta-50">Administração</p>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Pedidos</h1>
        <p className="mb-8 text-sm text-tinta-50">{carregando ? 'Carregando…' : `${pedidos.length} pedidos (últimos 200)`}</p>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroStatus('todos')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filtroStatus === 'todos' ? 'bg-tinta-solida text-white' : 'bg-tinta-5 text-tinta-70 hover:text-tinta'
            }`}
          >
            Todos
          </button>
          {statusFiltraveis.map((s) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                filtroStatus === s ? 'bg-tinta-solida text-white' : 'bg-tinta-5 text-tinta-70 hover:text-tinta'
              }`}
            >
              {rotuloStatusPedido(s)}
            </button>
          ))}
        </div>

        <section className="cartao p-6">
          {carregando ? (
            <p className="text-sm text-tinta-50">Carregando…</p>
          ) : pedidosFiltrados.length === 0 ? (
            <p className="text-sm text-tinta-50">Nenhum pedido com esse filtro.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tinta-20 text-left">
                    <th className="py-2 pr-4 rotulo">Código</th>
                    <th className="py-2 pr-4 rotulo">Serviço</th>
                    <th className="py-2 pr-4 rotulo">Cliente</th>
                    <th className="py-2 pr-4 rotulo">Profissional</th>
                    <th className="py-2 pr-4 rotulo">Dia, horário</th>
                    <th className="py-2 pr-4 rotulo">Status</th>
                    <th className="py-2 rotulo">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map((p) => (
                    <tr key={p.id} className="border-b border-tinta-10 last:border-0">
                      <td className="py-3 pr-4 font-bold numero">{p.code}</td>
                      <td className="py-3 pr-4">{porCodigo(p.service as never)?.nome ?? p.service}</td>
                      <td className="py-3 pr-4">{p.customer?.full_name ?? '—'}</td>
                      <td className="py-3 pr-4">{p.professional?.full_name ?? '—'}</td>
                      <td className="py-3 pr-4 numero">
                        {new Date(p.scheduled_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-tinta-5 px-2.5 py-1 text-xs font-bold text-tinta-70">
                          {rotuloStatusPedido(p.status)}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-verde-700 numero">{reais(p.price_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
