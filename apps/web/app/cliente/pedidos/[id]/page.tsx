'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePerfil } from '@/lib/usePerfil';
import { supabase } from '@/lib/supabase';
import { horas, reais, porCodigo } from '@/lib/catalogo';
import { Chat } from '@/components/Chat';

interface Pedido {
  id: string;
  code: string;
  service: string;
  scheduled_at: string;
  minutes: number;
  status: string;
  price_cents: number;
  address_id: string;
  professional_id: string | null;
  cancellation_fee_cents: number;
}

interface Endereco {
  street: string;
  number: string;
  complement: string | null;
  city: string;
  state: string;
}

const STATUS: Record<string, string> = {
  searching_professional: 'Procurando profissional',
  assigned: 'Profissional confirmado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  rated: 'Avaliado',
  cancelled_by_customer: 'Cancelado',
  cancelled_by_professional: 'Cancelado pelo profissional',
  no_show: 'Profissional não compareceu',
  refunded: 'Reembolsado',
};

export default function PedidoCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const perfil = usePerfil();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [endereco, setEndereco] = useState<Endereco | null>(null);
  const [profissional, setProfissional] = useState<{ full_name: string } | null>(null);
  const [jaAvaliado, setJaAvaliado] = useState(false);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!supabase) {
      setCarregando(false);
      return;
    }
    const { data: p } = await supabase
      .from('orders')
      .select('id, code, service, scheduled_at, minutes, status, price_cents, address_id, professional_id, cancellation_fee_cents')
      .eq('id', id)
      .maybeSingle();
    setPedido(p ?? null);

    if (p) {
      const [end, prof, rev] = await Promise.all([
        supabase.from('addresses').select('street, number, complement, city, state').eq('id', p.address_id).maybeSingle(),
        p.professional_id
          ? supabase.from('profiles').select('full_name').eq('id', p.professional_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('reviews').select('id').eq('order_id', p.id).maybeSingle(),
      ]);
      setEndereco(end.data ?? null);
      setProfissional(prof.data ?? null);
      setJaAvaliado(Boolean(rev.data));
    }
    setCarregando(false);
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function cancelar() {
    if (!supabase) return;
    setEnviando(true);
    setAviso(null);
    const { data } = await supabase.rpc('fn_cancelar_pedido', { p_order_id: id });
    setEnviando(false);
    if (!data) {
      setAviso('Não foi possível cancelar esse pedido agora.');
      return;
    }
    await carregar();
  }

  async function enviarAvaliacao(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !pedido?.professional_id) return;
    setEnviando(true);
    setAviso(null);
    const { error } = await supabase.from('reviews').insert({
      order_id: pedido.id,
      customer_id: perfil.id,
      professional_id: pedido.professional_id,
      rating: nota,
      comment: comentario || null,
    });
    setEnviando(false);
    if (error) {
      setAviso('Não foi possível enviar sua avaliação.');
      return;
    }
    setJaAvaliado(true);
  }

  if (carregando) return <main className="container-app py-10 text-sm text-tinta-50">Carregando…</main>;
  if (!pedido) {
    return (
      <main className="container-app py-16 text-center">
        <p className="font-bold">Pedido não encontrado.</p>
        <Link href="/cliente" className="mt-4 inline-block text-sm font-semibold text-tinta">
          Voltar
        </Link>
      </main>
    );
  }

  const servico = porCodigo(pedido.service as never);
  const podeCancelar = ['searching_professional', 'assigned'].includes(pedido.status);
  const podeAvaliar = pedido.status === 'completed' && !jaAvaliado;

  return (
    <main className="container-app flex max-w-2xl flex-col gap-6 py-10">
      <div>
        <Link href="/cliente/pedidos" className="text-sm font-semibold text-tinta-50">
          ← Meus pedidos
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{servico?.nome ?? pedido.service}</h1>
        <p className="text-sm text-tinta-50 numero">#{pedido.code}</p>
      </div>

      <div className="cartao flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-tinta-5 px-3 py-1 text-xs font-bold text-tinta-70">
            {STATUS[pedido.status] ?? pedido.status}
          </span>
          <span className="font-bold text-verde-700 numero">{reais(pedido.price_cents)}</span>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="rotulo">Quando</p>
            <p className="font-semibold numero">
              {new Date(pedido.scheduled_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · {horas(pedido.minutes)}
            </p>
          </div>
          {endereco && (
            <div>
              <p className="rotulo">Endereço</p>
              <p className="font-semibold">
                {endereco.street}, {endereco.number}
                {endereco.complement ? ` · ${endereco.complement}` : ''}
              </p>
              <p className="text-tinta-50">
                {endereco.city}/{endereco.state}
              </p>
            </div>
          )}
          {profissional && (
            <div>
              <p className="rotulo">Profissional</p>
              <p className="font-semibold">{profissional.full_name}</p>
            </div>
          )}
          {pedido.cancellation_fee_cents > 0 && (
            <div>
              <p className="rotulo">Taxa de cancelamento</p>
              <p className="font-semibold text-tinta">{reais(pedido.cancellation_fee_cents)}</p>
            </div>
          )}
        </div>

        {aviso && (
          <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">{aviso}</p>
        )}

        {podeCancelar && (
          <button onClick={cancelar} disabled={enviando} className="btn-contorno w-fit">
            Cancelar pedido
          </button>
        )}
      </div>

      {pedido.professional_id && (
        <div className="cartao p-6">
          <h2 className="mb-3 text-lg font-bold">Chat</h2>
          <Chat orderId={pedido.id} meuId={perfil.id} />
        </div>
      )}

      {podeAvaliar && (
        <div className="cartao p-6">
          <h2 className="mb-3 text-lg font-bold">Avaliar serviço</h2>
          <form onSubmit={enviarAvaliacao} className="flex flex-col gap-3">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNota(n)}
                  className={`grid h-10 w-10 place-items-center rounded-full border-2 font-bold ${
                    nota >= n ? 'border-tinta bg-tinta text-white' : 'border-tinta-20 text-tinta-50'
                  }`}
                  aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <textarea
              className="campo min-h-[80px]"
              placeholder="Comentário (opcional)"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
            <button className="btn-primario w-fit" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar avaliação'}
            </button>
          </form>
        </div>
      )}

      {jaAvaliado && (
        <p className="rounded-lg bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta-70">
          Você já avaliou esse serviço. Obrigado!
        </p>
      )}
    </main>
  );
}
