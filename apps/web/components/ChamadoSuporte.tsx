'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Mensagem {
  id: string;
  sender_id: string;
  is_admin_reply: boolean;
  body: string;
  created_at: string;
}

function horaMensagem(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Conversa de um chamado — usado tanto na tela do admin quanto na do usuário. */
export function ChamadoSuporte({ ticketId, meuId, souAdmin = false }: { ticketId: string; meuId: string; souAdmin?: boolean }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    if (!supabase) return;
    const { data } = await supabase
      .from('support_ticket_messages')
      .select('id, sender_id, is_admin_reply, body, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setMensagens(data ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !texto.trim()) return;
    setEnviando(true);
    await supabase.from('support_ticket_messages').insert({
      ticket_id: ticketId,
      sender_id: meuId,
      is_admin_reply: souAdmin,
      body: texto.trim(),
    });
    setTexto('');
    setEnviando(false);
    await carregar();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-[50vh] min-h-[8rem] flex-col gap-3 overflow-y-auto rounded-xl border border-tinta-10 p-3">
        {carregando ? (
          <p className="text-sm text-tinta-50">Carregando…</p>
        ) : mensagens.length === 0 ? (
          <p className="text-sm text-tinta-50">Nenhuma mensagem ainda.</p>
        ) : (
          mensagens.map((m) => {
            const minha = m.sender_id === meuId;
            return (
              <div key={m.id} className={`flex flex-col ${minha ? 'items-end' : 'items-start'}`}>
                <p className="mb-1 text-xs font-bold text-tinta-50">{minha ? 'Você' : m.is_admin_reply ? 'Suporte Plano Limpo' : 'Solicitante'}</p>
                <p
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    minha ? 'bg-tinta-solida text-white' : 'bg-tinta-5 text-tinta'
                  }`}
                >
                  {m.body}
                </p>
                <p className="mt-1 text-[11px] text-tinta-30 numero">{horaMensagem(m.created_at)}</p>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={enviar} className="flex gap-2">
        <input
          className="campo flex-1"
          placeholder="Escrever mensagem…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Mensagem"
        />
        <button className="btn-primario !px-5" disabled={enviando || !texto.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
