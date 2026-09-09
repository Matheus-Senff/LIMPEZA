'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePerfil } from '@/lib/usePerfil';
import { supabase } from '@/lib/supabase';
import { horas, reais, porCodigo, OPCIONAIS } from '@/lib/catalogo';
import { ChatPedido } from '@/components/ChatPedido';
import { Modal } from '@/components/Modal';
import { Contador } from '@/components/Contador';
import { rotuloStatusPedido } from '@/lib/statusPedido';

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
  addons: string[];
}

interface Endereco {
  street: string;
  number: string;
  complement: string | null;
  city: string;
  state: string;
  home_type: 'HOUSE' | 'APARTMENT' | 'STUDIO';
  bedrooms: number;
  bathrooms: number;
  access_notes: string | null;
}

const STATUS_CANCELADO = ['cancelled_by_customer', 'cancelled_by_professional', 'no_show', 'refunded'];

function mensagemNaoEditavel(status: string): string {
  if (STATUS_CANCELADO.includes(status)) {
    return 'Esse pedido foi cancelado e não pode mais ser editado.';
  }
  if (status === 'searching_professional') return '';
  return 'Esse pedido já foi aceito por um profissional e não pode mais ser editado.';
}

const TIPOS: { code: Endereco['home_type']; nome: string }[] = [
  { code: 'HOUSE', nome: 'Casa' },
  { code: 'APARTMENT', nome: 'Apartamento' },
  { code: 'STUDIO', nome: 'Studio' },
];

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

  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);
  const [editando, setEditando] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const [opcionaisEdit, setOpcionaisEdit] = useState<string[]>([]);
  const [quartosEdit, setQuartosEdit] = useState(2);
  const [banheirosEdit, setBanheirosEdit] = useState(1);
  const [tipoLarEdit, setTipoLarEdit] = useState<Endereco['home_type']>('APARTMENT');
  const [acessoEdit, setAcessoEdit] = useState('');

  const carregar = useCallback(async () => {
    if (!supabase) {
      setCarregando(false);
      return;
    }
    const { data: p } = await supabase
      .from('orders')
      .select(
        'id, code, service, scheduled_at, minutes, status, price_cents, address_id, professional_id, cancellation_fee_cents, addons',
      )
      .eq('id', id)
      .maybeSingle();
    setPedido(p ?? null);

    if (p) {
      const [end, prof, rev] = await Promise.all([
        supabase
          .from('addresses')
          .select('street, number, complement, city, state, home_type, bedrooms, bathrooms, access_notes')
          .eq('id', p.address_id)
          .maybeSingle(),
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

  function abrirDetalhes() {
    if (endereco) {
      setOpcionaisEdit(pedido?.addons ?? []);
      setQuartosEdit(endereco.bedrooms);
      setBanheirosEdit(endereco.bathrooms);
      setTipoLarEdit(endereco.home_type);
      setAcessoEdit(endereco.access_notes ?? '');
    }
    setErroEdicao(null);
    setEditando(false);
    setMostrarDetalhes(true);
  }

  async function salvarEdicao() {
    if (!supabase || !pedido) return;
    setSalvandoEdicao(true);
    setErroEdicao(null);
    const { data: sessao } = await supabase.auth.getSession();
    const token = sessao.session?.access_token;
    const r = await fetch(`/api/pedido/${pedido.id}/editar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        addons: opcionaisEdit,
        bedrooms: quartosEdit,
        bathrooms: banheirosEdit,
        homeType: tipoLarEdit,
        accessNotes: acessoEdit,
      }),
    }).then((x) => x.json());
    setSalvandoEdicao(false);

    if (r.erro === 'pedido_ja_aceito') {
      setErroEdicao('Um profissional já aceitou esse pedido — não é mais possível editar.');
      await carregar();
      return;
    }
    if (r.erro) {
      setErroEdicao('Não foi possível salvar as alterações agora.');
      return;
    }
    await carregar();
    setEditando(false);
    setMostrarDetalhes(false);
  }

  function alternarOpcionalEdit(code: string) {
    setOpcionaisEdit((atual) => (atual.includes(code) ? atual.filter((c) => c !== code) : [...atual, code]));
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
  const podeEditar = pedido.status === 'searching_professional';
  const podeAvaliar = pedido.status === 'completed' && !jaAvaliado;
  const opcionaisDoServico = servico ? OPCIONAIS.filter((o) => o.servicos.includes(servico.code)) : [];
  const nomesOpcionaisAtuais = OPCIONAIS.filter((o) => pedido.addons?.includes(o.code)).map((o) => o.nome);

  return (
    <main className="container-app flex max-w-2xl flex-col gap-6 py-10">
      <div>
        <Link href="/cliente/pedidos" className="text-sm font-semibold text-tinta-50">
          ← Meus pedidos
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{servico?.nome ?? pedido.service}</h1>
        <p className="text-sm text-tinta-50 numero">#{pedido.code}</p>
      </div>

      <button onClick={abrirDetalhes} className="cartao flex flex-col gap-4 p-6 text-left transition hover:border-tinta-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-tinta-5 px-3 py-1 text-xs font-bold text-tinta-70">
            {rotuloStatusPedido(pedido.status)}
          </span>
          <span className="font-bold text-verde-700 numero">{reais(pedido.price_cents)}</span>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="rotulo">Dia, Horário</p>
            <p className="font-semibold numero">
              {new Date(pedido.scheduled_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div>
            <p className="rotulo">Duração</p>
            <p className="font-semibold numero">{horas(pedido.minutes)}</p>
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
        <span className="text-sm font-semibold text-azul-600">Ver detalhes do que foi escolhido →</span>
      </button>

      {aviso && (
        <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">{aviso}</p>
      )}

      {podeCancelar && (
        <button onClick={cancelar} disabled={enviando} className="btn-contorno w-fit">
          Cancelar pedido
        </button>
      )}

      {pedido.professional_id && <ChatPedido orderId={pedido.id} meuId={perfil.id} />}

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

      {mostrarDetalhes && endereco && (
        <Modal titulo={editando ? 'Editar pedido' : 'Detalhes do pedido'} onFechar={() => setMostrarDetalhes(false)}>
          {!editando ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="rotulo">Serviço</p>
                  <p className="font-semibold">{servico?.nome ?? pedido.service}</p>
                </div>
                <div>
                  <p className="rotulo">Duração</p>
                  <p className="font-semibold numero">{horas(pedido.minutes)}</p>
                </div>
                <div>
                  <p className="rotulo">Tipo de imóvel</p>
                  <p className="font-semibold">{TIPOS.find((t) => t.code === endereco.home_type)?.nome}</p>
                </div>
                <div>
                  <p className="rotulo">Cômodos</p>
                  <p className="font-semibold numero">
                    {endereco.bedrooms} quarto{endereco.bedrooms === 1 ? '' : 's'} · {endereco.bathrooms} banheiro
                    {endereco.bathrooms === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div>
                <p className="rotulo">Itens opcionais</p>
                {nomesOpcionaisAtuais.length > 0 ? (
                  <ul className="mt-1 flex flex-col gap-1 text-sm">
                    {nomesOpcionaisAtuais.map((n) => (
                      <li key={n} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-verde-500" /> {n}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-tinta-50">Nenhum opcional selecionado.</p>
                )}
              </div>
              {endereco.access_notes && (
                <div>
                  <p className="rotulo">Instruções de acesso</p>
                  <p className="text-sm text-tinta-70">{endereco.access_notes}</p>
                </div>
              )}
              {podeEditar ? (
                <button onClick={() => setEditando(true)} className="btn-contorno w-fit">
                  Editar
                </button>
              ) : (
                <p className="text-xs text-tinta-50">{mensagemNaoEditavel(pedido.status)}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="rotulo mb-2">Tipo de imóvel</p>
                <div className="flex flex-wrap gap-2">
                  {TIPOS.map((t) => (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => setTipoLarEdit(t.code)}
                      className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
                        tipoLarEdit === t.code
                          ? 'border-azul-600 bg-azul-50 text-azul-700'
                          : 'border-tinta-20 text-tinta-50 hover:border-azul-200'
                      }`}
                    >
                      {t.nome}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Contador rotulo="quartos" valor={quartosEdit} onChange={setQuartosEdit} min={0} max={10} />
                <Contador rotulo="banheiros" valor={banheirosEdit} onChange={setBanheirosEdit} min={1} max={10} />
              </div>
              {opcionaisDoServico.length > 0 && (
                <div>
                  <p className="rotulo mb-2">Itens opcionais</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {opcionaisDoServico.map((o) => {
                      const ativo = opcionaisEdit.includes(o.code);
                      return (
                        <label
                          key={o.code}
                          className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm transition ${
                            ativo ? 'border-azul-600 bg-azul-50' : 'border-tinta-20 hover:border-azul-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={ativo}
                            onChange={() => alternarOpcionalEdit(o.code)}
                            className="h-4 w-4 accent-[#2563eb]"
                          />
                          {o.nome}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <p className="rotulo mb-2">Instruções de acesso</p>
                <textarea
                  className="campo min-h-[80px]"
                  placeholder="Portaria, chave com o vizinho, cachorro em casa…"
                  value={acessoEdit}
                  onChange={(e) => setAcessoEdit(e.target.value)}
                />
              </div>
              {erroEdicao && (
                <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">
                  {erroEdicao}
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={salvarEdicao} disabled={salvandoEdicao} className="btn-primario">
                  {salvandoEdicao ? 'Salvando…' : 'Salvar alterações'}
                </button>
                <button type="button" onClick={() => setEditando(false)} className="btn-contorno">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </main>
  );
}
