'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Modal } from './Modal';
import { ChamadoSuporte } from './ChamadoSuporte';
import { ROTULO_STATUS_CHAMADO, COR_STATUS_CHAMADO, type StatusChamado } from '@/lib/suporte';

interface Chamado {
  id: string;
  subject: string;
  status: StatusChamado;
  updated_at: string;
}

/** Central de suporte do cliente/profissional: abrir chamado e acompanhar os próprios. */
export function PainelSuporte({ meuId }: { meuId: string }) {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [abrindoNovo, setAbrindoNovo] = useState(false);
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [chamadoAberto, setChamadoAberto] = useState<Chamado | null>(null);

  async function carregar() {
    if (!supabase) return;
    const { data } = await supabase
      .from('support_tickets')
      .select('id, subject, status, updated_at')
      .order('updated_at', { ascending: false });
    setChamados(data ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function abrirChamado(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !assunto.trim() || !mensagem.trim()) return;
    setEnviando(true);
    const { data: chamado, error } = await supabase
      .from('support_tickets')
      .insert({ requester_id: meuId, subject: assunto.trim() })
      .select('id')
      .single();
    if (!error && chamado) {
      await supabase.from('support_ticket_messages').insert({
        ticket_id: chamado.id,
        sender_id: meuId,
        body: mensagem.trim(),
      });
    }
    setEnviando(false);
    setAssunto('');
    setMensagem('');
    setAbrindoNovo(false);
    await carregar();
  }

  return (
    <section className="cartao p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Suporte técnico</h2>
        <button onClick={() => setAbrindoNovo(true)} className="btn-contorno !px-4 !py-2 !text-xs">
          + Abrir chamado
        </button>
      </div>

      {carregando ? (
        <p className="text-sm text-tinta-50">Carregando…</p>
      ) : chamados.length === 0 ? (
        <p className="text-sm text-tinta-50">Nenhum chamado aberto ainda.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-tinta-10">
          {chamados.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setChamadoAberto(c)}
                className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left"
              >
                <span className="text-sm font-semibold">{c.subject}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${COR_STATUS_CHAMADO[c.status]}`}>
                  {ROTULO_STATUS_CHAMADO[c.status]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {abrindoNovo && (
        <Modal titulo="Abrir chamado" onFechar={() => setAbrindoNovo(false)}>
          <form onSubmit={abrirChamado} className="flex flex-col gap-3">
            <input
              className="campo"
              placeholder="Assunto"
              required
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              aria-label="Assunto"
            />
            <textarea
              className="campo min-h-[100px]"
              placeholder="Descreva o que está acontecendo"
              required
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              aria-label="Mensagem"
            />
            <button className="btn-primario w-fit" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar para o suporte'}
            </button>
          </form>
        </Modal>
      )}

      {chamadoAberto && (
        <Modal titulo={chamadoAberto.subject} onFechar={() => setChamadoAberto(null)}>
          <ChamadoSuporte ticketId={chamadoAberto.id} meuId={meuId} />
          {chamadoAberto.status !== 'closed' && (
            <p className="mt-4 text-xs text-tinta-50">
              Só a administração pode marcar este chamado como resolvido.
            </p>
          )}
        </Modal>
      )}
    </section>
  );
}
