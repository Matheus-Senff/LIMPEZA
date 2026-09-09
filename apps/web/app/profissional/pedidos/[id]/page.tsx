'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePerfil } from '@/lib/usePerfil';
import { supabase } from '@/lib/supabase';
import { horas, reais } from '@/lib/catalogo';
import { useCatalogo } from '@/lib/useCatalogo';
import { dataHoraPorExtenso } from '@/lib/agenda';
import { ChatPedido } from '@/components/ChatPedido';
import { rotuloStatusPedido } from '@/lib/statusPedido';
import { Modal } from '@/components/Modal';
import { ResumoEncerramento, chatLiberado } from '@/components/ResumoEncerramento';

interface Pedido {
  id: string;
  code: string;
  service: string;
  scheduled_at: string;
  minutes: number;
  status: string;
  payout_cents: number;
  address_id: string;
  customer_id: string;
  cancellation_reason: string | null;
}

interface Endereco {
  street: string;
  number: string;
  complement: string | null;
  city: string;
  state: string;
  access_notes: string | null;
}

export default function PedidoProfissional({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const perfil = usePerfil();
  const { servicos: catalogoServicos } = useCatalogo();
  const porCodigo = (code: string) => catalogoServicos.find((s) => s.code === code);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [endereco, setEndereco] = useState<Endereco | null>(null);
  const [cliente, setCliente] = useState<{ full_name: string } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [avaliacao, setAvaliacao] = useState<{ rating: number; comment: string | null } | null>(null);
  const [mostrarCancelamento, setMostrarCancelamento] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  const carregar = useCallback(async () => {
    if (!supabase) {
      setCarregando(false);
      return;
    }
    const { data: p } = await supabase
      .from('orders')
      .select('id, code, service, scheduled_at, minutes, status, payout_cents, address_id, customer_id, cancellation_reason')
      .eq('id', id)
      .maybeSingle();
    setPedido(p ?? null);

    if (p) {
      const [end, cli, rev] = await Promise.all([
        supabase
          .from('addresses')
          .select('street, number, complement, city, state, access_notes')
          .eq('id', p.address_id)
          .maybeSingle(),
        supabase.from('profiles').select('full_name').eq('id', p.customer_id).maybeSingle(),
        supabase.from('reviews').select('rating, comment').eq('order_id', p.id).maybeSingle(),
      ]);
      setEndereco(end.data ?? null);
      setCliente(cli.data ?? null);
      setAvaliacao(rev.data ?? null);
    }
    setCarregando(false);
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function checkIn() {
    if (!supabase) return;
    setEnviando(true);
    setAviso(null);
    const { data } = await supabase.rpc('fn_check_in', { p_order_id: id });
    setEnviando(false);
    if (!data) setAviso('Não foi possível fazer o check-in agora.');
    await carregar();
  }

  async function checkOut() {
    if (!supabase) return;
    setEnviando(true);
    setAviso(null);
    const { data } = await supabase.rpc('fn_check_out', { p_order_id: id });
    setEnviando(false);
    if (!data) setAviso('Não foi possível fazer o check-out agora.');
    await carregar();
  }

  async function cancelar() {
    if (!supabase) return;
    if (!motivoCancelamento.trim()) {
      setAviso('Conte rapidinho o motivo do cancelamento.');
      return;
    }
    setEnviando(true);
    setAviso(null);
    const { data: sessao } = await supabase.auth.getSession();
    const token = sessao.session?.access_token;
    const r = await fetch(`/api/pedido/${id}/cancelar-profissional`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ motivo: motivoCancelamento.trim() }),
    }).then((x) => x.json());
    setEnviando(false);
    if (!r.cancelado) {
      setAviso('Não foi possível cancelar esse serviço agora.');
      return;
    }
    setMostrarCancelamento(false);
    setMotivoCancelamento('');
    await carregar();
  }

  if (carregando) return <main className="container-app py-10 text-sm text-tinta-50">Carregando…</main>;
  if (!pedido) {
    return (
      <main className="container-app py-16 text-center">
        <p className="font-bold">Pedido não encontrado.</p>
        <Link href="/profissional" className="mt-4 inline-block text-sm font-semibold text-tinta">
          Voltar
        </Link>
      </main>
    );
  }

  const servico = porCodigo(pedido.service as never);

  return (
    <main className="container-app flex max-w-2xl flex-col gap-6 py-10">
      <div>
        <Link href="/profissional/pedidos" className="text-sm font-semibold text-tinta-50">
          ← Meus pedidos
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{servico?.nome ?? pedido.service}</h1>
        <p className="text-sm text-tinta-50 numero">#{pedido.code}</p>
      </div>

      <div className="cartao flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-tinta-5 px-3 py-1 text-xs font-bold text-tinta-70">
            {rotuloStatusPedido(pedido.status)}
          </span>
          <span className="text-2xl font-extrabold text-verde-700 numero">{reais(pedido.payout_cents)}</span>
        </div>

        <div>
          <p className="rotulo">Dia e horário do serviço</p>
          <p className="text-lg font-extrabold tracking-tight numero">{dataHoraPorExtenso(pedido.scheduled_at)}</p>
        </div>

        <div className="grid gap-4 border-t border-tinta-10 pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="rotulo">Duração do serviço</p>
            <p className="text-base font-bold numero">{horas(pedido.minutes)}</p>
          </div>
          {cliente && (
            <div>
              <p className="rotulo">Cliente</p>
              <p className="font-semibold">{cliente.full_name}</p>
            </div>
          )}
          {endereco && (
            <div className="sm:col-span-2">
              <p className="rotulo">Endereço</p>
              <p className="font-semibold">
                {endereco.street}, {endereco.number}
                {endereco.complement ? ` · ${endereco.complement}` : ''} — {endereco.city}/{endereco.state}
              </p>
              {endereco.access_notes && <p className="mt-1 text-tinta-50">{endereco.access_notes}</p>}
            </div>
          )}
        </div>

        {aviso && (
          <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">{aviso}</p>
        )}

        <div className="flex gap-3">
          {pedido.status === 'assigned' && (
            <button onClick={checkIn} disabled={enviando} className="btn-verde">
              Fazer check-in
            </button>
          )}
          {pedido.status === 'in_progress' && (
            <button onClick={checkOut} disabled={enviando} className="btn-verde">
              Fazer check-out
            </button>
          )}
          {['assigned', 'in_progress'].includes(pedido.status) && (
            <button onClick={() => setMostrarCancelamento(true)} disabled={enviando} className="btn-contorno">
              Cancelar serviço
            </button>
          )}
        </div>
      </div>

      {cliente && chatLiberado(pedido.status) && (
        <ChatPedido orderId={pedido.id} meuId={perfil.id} meuNome={perfil.full_name} outroNome={cliente.full_name} />
      )}

      <ResumoEncerramento status={pedido.status} motivo={pedido.cancellation_reason} avaliacao={avaliacao} />

      {mostrarCancelamento && (
        <Modal titulo="Cancelar serviço" onFechar={() => setMostrarCancelamento(false)}>
          <p className="text-sm text-tinta-70">Por que você não vai poder atender esse serviço?</p>
          <textarea
            className="campo mt-3 min-h-[90px]"
            placeholder="Escreva o motivo do cancelamento"
            value={motivoCancelamento}
            onChange={(e) => setMotivoCancelamento(e.target.value)}
            aria-label="Motivo do cancelamento"
          />
          <p className="mt-2 text-xs text-tinta-50">O cliente vê essa justificativa no lugar do chat.</p>
          <div className="mt-5 flex gap-2">
            <button onClick={cancelar} disabled={enviando} className="btn-contorno">
              {enviando ? 'Cancelando…' : 'Confirmar cancelamento'}
            </button>
            <button
              type="button"
              onClick={() => setMostrarCancelamento(false)}
              className="text-sm font-semibold text-tinta-50"
            >
              Voltar
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
