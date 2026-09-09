'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePerfil } from '@/lib/usePerfil';
import { supabase } from '@/lib/supabase';
import { horas, reais, porCodigo, OPCIONAIS } from '@/lib/catalogo';
import { Modal } from '@/components/Modal';
import { MapaOfertas, type OfertaNoMapa } from '@/components/MapaOfertas';

interface DadosProfissional {
  rating_avg: number;
  rating_count: number;
  completed_orders: number;
}

interface Detalhes {
  city: string;
  state: string;
  district: string | null;
  home_type: 'HOUSE' | 'APARTMENT' | 'STUDIO';
  bedrooms: number;
  bathrooms: number;
  has_pets: boolean;
  bairroLat?: number | null;
  bairroLng?: number | null;
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
    addons: string[];
  } | null;
  detalhes?: Detalhes;
}

const TIPOS: Record<string, string> = { HOUSE: 'Casa', APARTMENT: 'Apartamento', STUDIO: 'Studio' };

export default function ProfissionalHome() {
  const perfil = usePerfil();
  const [dados, setDados] = useState<DadosProfissional | null>(null);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [detalheAberto, setDetalheAberto] = useState<Oferta | null>(null);
  const [visao, setVisao] = useState<'lista' | 'mapa'>('lista');

  const carregar = useCallback(async () => {
    if (!supabase) {
      setCarregando(false);
      return;
    }
    const [prof, ofe] = await Promise.all([
      supabase
        .from('professionals')
        .select('rating_avg, rating_count, completed_orders')
        .eq('id', perfil.id)
        .maybeSingle(),
      supabase
        .from('order_offers')
        .select('id, order_id, expires_at, orders(service, scheduled_at, minutes, payout_cents, addons)')
        .eq('professional_id', perfil.id)
        .eq('status', 'sent')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true }),
    ]);
    setDados((prof.data as DadosProfissional) ?? null);
    const listaOfertas = (ofe.data as unknown as Oferta[]) ?? [];
    setOfertas(listaOfertas);
    setCarregando(false);

    const comDetalhes = await Promise.all(
      listaOfertas.map(async (o) => {
        const { data } = await supabase!.rpc('fn_cidade_da_oferta', { p_order_id: o.order_id });
        const linha = Array.isArray(data) ? (data[0] as Detalhes) : undefined;
        return { ...o, detalhes: linha };
      }),
    );
    setOfertas(comDetalhes);
  }, [perfil.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Geocodifica o bairro só quando o profissional realmente abre o mapa —
  // evita bater no serviço externo (Nominatim) pra ofertas que ninguém
  // olha no mapa. Resultado fica em cache no banco pro próximo pedido do
  // mesmo bairro não precisar geocodificar de novo.
  useEffect(() => {
    if (visao !== 'mapa' || !supabase) return;
    const pendentes = ofertas.filter(
      (o) => o.detalhes?.district && o.detalhes.bairroLat === undefined,
    );
    if (pendentes.length === 0) return;

    (async () => {
      const { data: sessao } = await supabase!.auth.getSession();
      const token = sessao.session?.access_token;
      const resultados = await Promise.all(
        pendentes.map(async (o) => {
          const r = await fetch('/api/geocodificar-bairro', {
            method: 'POST',
            headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ city: o.detalhes!.city, state: o.detalhes!.state, district: o.detalhes!.district }),
          }).then((x) => x.json());
          return { id: o.id, lat: r.lat ?? null, lng: r.lng ?? null };
        }),
      );
      setOfertas((atual) =>
        atual.map((o) => {
          const achado = resultados.find((r) => r.id === o.id);
          if (!achado || !o.detalhes) return o;
          return { ...o, detalhes: { ...o.detalhes, bairroLat: achado.lat, bairroLng: achado.lng } };
        }),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visao, ofertas]);

  // Se o cliente editar o pedido enquanto a oferta ainda está pendente, o
  // profissional vê a mudança sem precisar recarregar a página. O RLS do
  // Realtime já garante que só chegam eventos de pedidos que ele pode ver.
  const idsEmOferta = ofertas.map((o) => o.order_id).join(',');
  useEffect(() => {
    if (!supabase || !idsEmOferta) return;
    const ids = new Set(idsEmOferta.split(','));
    const canal = supabase
      .channel(`pedidos-em-oferta-${perfil.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          if (ids.has((payload.new as { id: string }).id)) carregar();
        },
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil.id, idsEmOferta]);

  async function aceitar(oferta: Oferta) {
    if (!supabase) return;
    setRespondendo(oferta.id);
    setAviso(null);
    const { data } = await supabase.rpc('fn_aceitar_oferta', { p_order_id: oferta.order_id });
    setRespondendo(null);
    setDetalheAberto(null);
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
    setDetalheAberto(null);
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight">Ofertas disponíveis</h2>
          <div className="flex gap-2 rounded-full bg-tinta-5 p-1">
            <button
              onClick={() => setVisao('lista')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                visao === 'lista' ? 'bg-superficie text-tinta shadow-cartao' : 'text-tinta-50'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setVisao('mapa')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                visao === 'mapa' ? 'bg-superficie text-tinta shadow-cartao' : 'text-tinta-50'
              }`}
            >
              Mapa
            </button>
          </div>
        </div>
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
          </div>
        ) : visao === 'mapa' ? (
          <MapaOfertas
            ofertas={ofertas
              .filter((o) => o.detalhes && o.orders)
              .map(
                (o): OfertaNoMapa => ({
                  id: o.id,
                  order_id: o.order_id,
                  cidade: o.detalhes!.city,
                  rotulo: porCodigo(o.orders!.service as never)?.nome ?? o.orders!.service,
                  valor: reais(o.orders!.payout_cents),
                  bairroLat: o.detalhes!.bairroLat,
                  bairroLng: o.detalhes!.bairroLng,
                }),
              )}
            onSelecionar={(id) => setDetalheAberto(ofertas.find((o) => o.id === id) ?? null)}
          />
        ) : (
          <ul className="cartao flex flex-col divide-y divide-tinta-10 p-2">
            {ofertas.map((o) => {
              const servico = o.orders ? porCodigo(o.orders.service as never) : null;
              return (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <button className="text-left" onClick={() => setDetalheAberto(o)}>
                    <p className="font-bold underline decoration-tinta-20 underline-offset-2">
                      {servico?.nome ?? o.orders?.service}
                      {o.detalhes && (
                        <span className="ml-2 rounded-full bg-tinta-5 px-2 py-0.5 text-[11px] font-bold text-tinta-70">
                          {o.detalhes.district ? `${o.detalhes.district}, ` : ''}
                          {o.detalhes.city}/{o.detalhes.state}
                        </span>
                      )}
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
                  </button>
                  {o.orders && <span className="font-bold text-verde-700 numero">{reais(o.orders.payout_cents)}</span>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDetalheAberto(o)}
                      className="btn-contorno !px-4 !py-2 !text-xs"
                    >
                      Ver detalhes
                    </button>
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

      {detalheAberto && (
        <Modal titulo="Detalhes da oferta" onFechar={() => setDetalheAberto(null)}>
          <DetalheOferta oferta={detalheAberto} />
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => aceitar(detalheAberto)}
              disabled={respondendo === detalheAberto.id}
              className="btn-verde"
            >
              Aceitar
            </button>
            <button
              onClick={() => recusar(detalheAberto)}
              disabled={respondendo === detalheAberto.id}
              className="btn-contorno"
            >
              Recusar
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function DetalheOferta({ oferta }: { oferta: Oferta }) {
  const servico = oferta.orders ? porCodigo(oferta.orders.service as never) : null;
  const nomesOpcionais = OPCIONAIS.filter((o) => oferta.orders?.addons?.includes(o.code)).map((o) => o.nome);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="rotulo">Serviço</p>
          <p className="font-semibold">{servico?.nome ?? oferta.orders?.service}</p>
        </div>
        <div>
          <p className="rotulo">Duração</p>
          <p className="font-semibold numero">{oferta.orders ? horas(oferta.orders.minutes) : '—'}</p>
        </div>
        <div>
          <p className="rotulo">Região</p>
          <p className="font-semibold">
            {oferta.detalhes
              ? `${oferta.detalhes.district ? `${oferta.detalhes.district}, ` : ''}${oferta.detalhes.city}/${oferta.detalhes.state}`
              : '—'}
          </p>
        </div>
        <div>
          <p className="rotulo">Repasse</p>
          <p className="font-semibold text-verde-700 numero">
            {oferta.orders ? reais(oferta.orders.payout_cents) : '—'}
          </p>
        </div>
        {oferta.detalhes && (
          <>
            <div>
              <p className="rotulo">Tipo de imóvel</p>
              <p className="font-semibold">{TIPOS[oferta.detalhes.home_type] ?? oferta.detalhes.home_type}</p>
            </div>
            <div>
              <p className="rotulo">Cômodos</p>
              <p className="font-semibold numero">
                {oferta.detalhes.bedrooms} quarto{oferta.detalhes.bedrooms === 1 ? '' : 's'} ·{' '}
                {oferta.detalhes.bathrooms} banheiro{oferta.detalhes.bathrooms === 1 ? '' : 's'}
                {oferta.detalhes.has_pets ? ' · tem animal de estimação' : ''}
              </p>
            </div>
          </>
        )}
      </div>
      <div>
        <p className="rotulo">Itens opcionais</p>
        {nomesOpcionais.length > 0 ? (
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {nomesOpcionais.map((n) => (
              <li key={n} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-verde-500" /> {n}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-tinta-50">Nenhum opcional selecionado.</p>
        )}
      </div>
      <p className="text-xs text-tinta-50">
        O endereço completo e as instruções de acesso só ficam disponíveis depois que você aceitar.
      </p>
    </div>
  );
}
