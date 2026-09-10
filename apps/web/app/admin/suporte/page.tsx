'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePerfil } from '@/lib/usePerfil';
import { Modal } from '@/components/Modal';
import { ChamadoSuporte } from '@/components/ChamadoSuporte';
import { ROTULO_STATUS_CHAMADO, COR_STATUS_CHAMADO, type StatusChamado } from '@/lib/suporte';

interface ChamadoAdmin {
  id: string;
  subject: string;
  status: StatusChamado;
  updated_at: string;
  created_at: string;
  requester: { full_name: string; email: string } | null;
}

export default function AdminSuporte() {
  const perfil = usePerfil();
  const [chamados, setChamados] = useState<ChamadoAdmin[]>([]);
  const [filtro, setFiltro] = useState<'abertos' | 'todos'>('abertos');
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState<ChamadoAdmin | null>(null);
  const [statusPendente, setStatusPendente] = useState<StatusChamado | null>(null);
  const [aplicandoStatus, setAplicandoStatus] = useState(false);

  async function carregar() {
    if (!supabase) {
      setCarregando(false);
      return;
    }
    const { data } = await supabase
      .from('support_tickets')
      .select('id, subject, status, updated_at, created_at, requester:requester_id(full_name, email)')
      .order('updated_at', { ascending: false });
    setChamados((data as unknown as ChamadoAdmin[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function mudarStatus(id: string, status: StatusChamado) {
    if (!supabase) return;
    await supabase.from('support_tickets').update({ status }).eq('id', id);
    setSelecionado((atual) => (atual && atual.id === id ? { ...atual, status } : atual));
    await carregar();
  }

  async function confirmarMudancaStatus() {
    if (!selecionado || !statusPendente) return;
    setAplicandoStatus(true);
    await mudarStatus(selecionado.id, statusPendente);
    setAplicandoStatus(false);
    setStatusPendente(null);
  }

  const filtrados = filtro === 'todos' ? chamados : chamados.filter((c) => c.status !== 'closed' && c.status !== 'resolved');

  return (
    <main className="bg-tinta-5 pb-16">
      <div className="container-app py-10">
        <p className="rotulo mb-1 text-tinta-50">Administração</p>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Suporte técnico</h1>
        <p className="mb-8 text-sm text-tinta-50">{carregando ? 'Carregando…' : `${filtrados.length} chamados`}</p>

        <div className="mb-5 flex gap-2">
          <button
            onClick={() => setFiltro('abertos')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filtro === 'abertos' ? 'bg-tinta-solida text-white' : 'bg-tinta-5 text-tinta-70'
            }`}
          >
            Em aberto
          </button>
          <button
            onClick={() => setFiltro('todos')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filtro === 'todos' ? 'bg-tinta-solida text-white' : 'bg-tinta-5 text-tinta-70'
            }`}
          >
            Todos
          </button>
        </div>

        <section className="cartao p-6">
          {carregando ? (
            <p className="text-sm text-tinta-50">Carregando…</p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-tinta-50">Nenhum chamado por aqui.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tinta-20 text-left">
                    <th className="py-2 pr-4 rotulo">Assunto</th>
                    <th className="py-2 pr-4 rotulo">Quem abriu</th>
                    <th className="py-2 pr-4 rotulo">Status</th>
                    <th className="py-2 rotulo">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((c) => (
                    <tr key={c.id} className="cursor-pointer border-b border-tinta-10 last:border-0 hover:bg-tinta-5" onClick={() => setSelecionado(c)}>
                      <td className="py-3 pr-4 font-semibold">{c.subject}</td>
                      <td className="py-3 pr-4">
                        <p>{c.requester?.full_name ?? '—'}</p>
                        <p className="text-xs text-tinta-50">{c.requester?.email ?? ''}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${COR_STATUS_CHAMADO[c.status]}`}>
                          {ROTULO_STATUS_CHAMADO[c.status]}
                        </span>
                      </td>
                      <td className="py-3 numero">{new Date(c.updated_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selecionado && (
        <Modal
          titulo={selecionado.subject}
          onFechar={() => {
            setSelecionado(null);
            setStatusPendente(null);
          }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-tinta-50">
              {selecionado.requester?.full_name} · {selecionado.requester?.email}
            </span>
          </div>
          <ChamadoSuporte ticketId={selecionado.id} meuId={perfil.id} souAdmin />

          <div className="mt-4 border-t border-tinta-10 pt-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-tinta-50">Status atual</span>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${COR_STATUS_CHAMADO[selecionado.status]}`}>
                {ROTULO_STATUS_CHAMADO[selecionado.status]}
              </span>
            </div>

            {statusPendente ? (
              <div className="rounded-xl border border-tinta-20 bg-tinta-5 p-4">
                <p className="text-sm font-semibold text-tinta">
                  Confirmar mudança de status para{' '}
                  <span className="font-extrabold">{ROTULO_STATUS_CHAMADO[statusPendente]}</span>?
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={confirmarMudancaStatus} disabled={aplicandoStatus} className="btn-primario !px-4 !py-2 !text-xs">
                    {aplicandoStatus ? 'Aplicando…' : 'Confirmar mudança'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusPendente(null)}
                    disabled={aplicandoStatus}
                    className="text-xs font-semibold text-tinta-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1 rounded-full bg-tinta-5 p-1">
                {(Object.keys(ROTULO_STATUS_CHAMADO) as StatusChamado[])
                  .filter((s) => s !== 'open')
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusPendente(s)}
                      disabled={s === selecionado.status}
                      className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:cursor-default disabled:opacity-40 ${
                        s === selecionado.status
                          ? 'bg-superficie text-tinta shadow-cartao'
                          : 'text-tinta-50 hover:text-tinta'
                      }`}
                    >
                      {ROTULO_STATUS_CHAMADO[s]}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </main>
  );
}
