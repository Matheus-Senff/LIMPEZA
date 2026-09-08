'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePerfil } from '@/lib/usePerfil';
import { supabase } from '@/lib/supabase';
import { horas, reais, porCodigo } from '@/lib/catalogo';

interface DadosProfissional {
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

interface Oferta {
  id: string;
  order_id: string;
  expires_at: string;
  orders: {
    service: string;
    scheduled_at: string;
    minutes: number;
    payout_cents: number;
  } | null;
  cidade?: string;
}

export default function ProfissionalHome() {
  const perfil = usePerfil();
  const [dados, setDados] = useState<DadosProfissional | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!supabase) {
      setCarregando(false);
      return;
    }
    const [prof, ord, ofe] = await Promise.all([
      supabase
        .from('professionals')
        .select('rating_avg, rating_count, completed_orders')
        .eq('id', perfil.id)
        .maybeSingle(),
      supabase
        .from('orders')
        .select('id, code, service, scheduled_at, minutes, status, payout_cents')
        .eq('professional_id', perfil.id)
        .order('scheduled_at', { ascending: true })
        .limit(20),
      supabase
        .from('order_offers')
        .select('id, order_id, expires_at, orders(service, scheduled_at, minutes, payout_cents)')
        .eq('professional_id', perfil.id)
        .eq('status', 'sent')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true }),
    ]);
    setDados((prof.data as DadosProfissional) ?? null);
    setPedidos(ord.data ?? []);
    const listaOfertas = (ofe.data as unknown as Oferta[]) ?? [];
    setOfertas(listaOfertas);
    setCarregando(false);

    const comCidade = await Promise.all(
      listaOfertas.map(async (o) => {
        const { data } = await supabase!.rpc('fn_cidade_da_oferta', { p_order_id: o.order_id });
        const linha = Array.isArray(data) ? data[0] : null;
        return { ...o, cidade: linha ? `${linha.city}/${linha.state}` : undefined };
      }),
    );
    setOfertas(comCidade);
  }, [perfil.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function aceitar(oferta: Oferta) {
    if (!supabase) return;
    setRespondendo(oferta.id);
    setAviso(null);
    const { data } = await supabase.rpc('fn_aceitar_oferta', { p_order_id: oferta.order_id });
    setRespondendo(null);
    if (!data) {
      setAviso('Esse pedido já foi aceito por outro profissional.');
    }
    await carregar();
  }

  async function recusar(oferta: Oferta) {
    if (!supabase) return;
    setRespondendo(oferta.id);
    await supabase
      .from('order_offers')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', oferta.id);
    setRespondendo(null);
    await carregar();
  }

  const primeiroNome = perfil.full_name.split(' ')[0];

  return (
    <main className="container-app flex flex-col gap-8 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Olá, {primeiroNome}</h1>

      {!carregando && dados && (
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
        <h2 className="mb-4 text-xl font-bold tracking-tight">Ofertas disponíveis</h2>
        {aviso && (
          <p className="mb-4 rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">
            {aviso}
          </p>
        )}
        {carregando ? (
          <p className="text-sm text-tinta-50">Carregando…</p>
        ) : ofertas.length === 0 ? (
          <div className="cartao p-8 text-center">
            <p className="font-semibold">Nenhuma oferta no momento</p>
            <p className="mt-1 text-sm text-tinta-50">Pedidos novos na sua região aparecem aqui.</p>
          </div>
        ) : (
          <ul className="cartao flex flex-col divide-y divide-tinta-10 p-2">
            {ofertas.map((o) => {
              const servico = o.orders ? porCodigo(o.orders.service as never) : null;
              return (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-bold">
                      {servico?.nome ?? o.orders?.service}
                      {o.cidade && <span className="ml-2 rounded-full bg-tinta-5 px-2 py-0.5 text-[11px] font-bold text-tinta-70">{o.cidade}</span>}
                    </p>
                    {o.orders && (
                      <p className="text-xs text-tinta-50 numero">
                        {new Date(o.orders.scheduled_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {horas(o.orders.minutes)}
                      </p>
                    )}
                  </div>
                  {o.orders && <span className="font-bold text-verde-700 numero">{reais(o.orders.payout_cents)}</span>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => aceitar(o)}
                      disabled={respondendo === o.id}
                      className="btn-verde !px-4 !py-2 !text-xs"
                    >
                      Aceitar
                    </button>
                    <button
                      onClick={() => recusar(o)}
                      disabled={respondendo === o.id}
                      className="btn-contorno !px-4 !py-2 !text-xs"
                    >
                      Recusar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight">Seus pedidos</h2>
        {carregando ? (
          <p className="text-sm text-tinta-50">Carregando…</p>
        ) : pedidos.length === 0 ? (
          <div className="cartao p-8 text-center">
            <p className="font-semibold">Nenhum pedido no momento</p>
            <p className="mt-1 text-sm text-tinta-50">Pedidos que você aceitar aparecem aqui.</p>
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
                <span className="rounded-full bg-tinta-5 px-3 py-1 text-xs font-bold text-tinta-70">{p.status}</span>
                <span className="font-bold text-verde-700 numero">{reais(p.payout_cents)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
