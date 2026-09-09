'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { reais, porCodigo } from '@/lib/catalogo';
import { rotuloStatusPedido } from '@/lib/statusPedido';

interface Metricas {
  clientes: number;
  profissionais: number;
  credenciamentoPendente: number;
  pedidosAtivos: number;
  pedidosConcluidos: number;
  pedidosCancelados: number;
  chamadosAbertos: number;
  faturamentoTotal: number;
}

interface PedidoRecente {
  id: string;
  code: string;
  service: string;
  status: string;
  price_cents: number;
  created_at: string;
}

const STATUS_ATIVOS = ['searching_professional', 'assigned', 'in_progress'];
const STATUS_CANCELADOS = ['cancelled_by_customer', 'cancelled_by_professional', 'no_show', 'refunded'];

export default function AdminVisaoGeral() {
  const [m, setM] = useState<Metricas | null>(null);
  const [recentes, setRecentes] = useState<PedidoRecente[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setCarregando(false);
        return;
      }
      const [clientes, profissionais, pendentes, ativos, concluidos, cancelados, chamados, pedidos, faturamento] =
        await Promise.all([
          supabase.from('customers').select('id', { count: 'exact', head: true }),
          supabase.from('professionals').select('id', { count: 'exact', head: true }),
          supabase
            .from('professionals')
            .select('id', { count: 'exact', head: true })
            .in('accreditation_status', ['pending', 'in_review']),
          supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', STATUS_ATIVOS),
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .in('status', ['completed', 'rated']),
          supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', STATUS_CANCELADOS),
          supabase
            .from('support_tickets')
            .select('id', { count: 'exact', head: true })
            .in('status', ['open', 'in_progress']),
          supabase
            .from('orders')
            .select('id, code, service, status, price_cents, created_at')
            .order('created_at', { ascending: false })
            .limit(8),
          supabase.from('orders').select('price_cents').in('status', ['completed', 'rated']),
        ]);

      setM({
        clientes: clientes.count ?? 0,
        profissionais: profissionais.count ?? 0,
        credenciamentoPendente: pendentes.count ?? 0,
        pedidosAtivos: ativos.count ?? 0,
        pedidosConcluidos: concluidos.count ?? 0,
        pedidosCancelados: cancelados.count ?? 0,
        chamadosAbertos: chamados.count ?? 0,
        faturamentoTotal: (faturamento.data ?? []).reduce((soma, p) => soma + p.price_cents, 0),
      });
      setRecentes(pedidos.data ?? []);
      setCarregando(false);
    })();
  }, []);

  return (
    <main className="bg-tinta-5 pb-16">
      <div className="container-app py-10">
        <p className="rotulo mb-1 text-tinta-50">Administração</p>
        <h1 className="mb-8 text-2xl font-bold tracking-tight">Visão geral</h1>

        {m?.credenciamentoPendente ? (
          <Link
            href="/admin/profissionais"
            className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-tinta-20 bg-superficie px-5 py-4 transition hover:border-tinta-30"
          >
            <span className="text-sm font-semibold">
              {m.credenciamentoPendente} profissional{m.credenciamentoPendente > 1 ? 'is' : ''} aguardando análise de credenciamento
            </span>
            <span className="text-xs font-bold uppercase tracking-wide text-azul-600">Analisar →</span>
          </Link>
        ) : null}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metrica rotulo="Clientes" valor={carregando ? '…' : String(m?.clientes ?? 0)} />
          <Metrica rotulo="Profissionais" valor={carregando ? '…' : String(m?.profissionais ?? 0)} />
          <Metrica
            rotulo="Credenciamento pendente"
            valor={carregando ? '…' : String(m?.credenciamentoPendente ?? 0)}
          />
          <Metrica rotulo="Chamados de suporte abertos" valor={carregando ? '…' : String(m?.chamadosAbertos ?? 0)} />
          <Metrica rotulo="Pedidos em andamento" valor={carregando ? '…' : String(m?.pedidosAtivos ?? 0)} />
          <Metrica rotulo="Pedidos concluídos" valor={carregando ? '…' : String(m?.pedidosConcluidos ?? 0)} />
          <Metrica rotulo="Pedidos cancelados" valor={carregando ? '…' : String(m?.pedidosCancelados ?? 0)} />
          <Metrica
            rotulo="Faturado (concluídos)"
            valor={carregando ? '…' : reais(m?.faturamentoTotal ?? 0)}
          />
        </div>

        <section className="cartao p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Pedidos recentes</h2>
            <Link href="/admin/pedidos" className="text-xs font-bold uppercase tracking-wide text-azul-600">
              Ver todos →
            </Link>
          </div>
          {carregando ? (
            <p className="text-sm text-tinta-50">Carregando…</p>
          ) : recentes.length === 0 ? (
            <p className="text-sm text-tinta-50">Nenhum pedido ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tinta-20 text-left">
                    <th className="py-2 pr-4 rotulo">Código</th>
                    <th className="py-2 pr-4 rotulo">Serviço</th>
                    <th className="py-2 pr-4 rotulo">Status</th>
                    <th className="py-2 rotulo">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {recentes.map((p) => (
                    <tr key={p.id} className="border-b border-tinta-10 last:border-0">
                      <td className="py-3 pr-4 font-bold numero">{p.code}</td>
                      <td className="py-3 pr-4">{porCodigo(p.service as never)?.nome ?? p.service}</td>
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

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="cartao p-5">
      <p className="rotulo">{rotulo}</p>
      <p className="text-2xl font-bold numero">{valor}</p>
    </div>
  );
}
