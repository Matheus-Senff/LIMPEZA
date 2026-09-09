'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Mensagem {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function Chat({ orderId, meuId }: { orderId: string; meuId: string }) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(true);
  const fimDaLista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabase) {
      setCarregando(false);
      return;
    }
    let ativo = true;

    (async () => {
      const { data: thread } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (!ativo) return;
      if (!thread) {
        setCarregando(false);
        return;
      }
      setThreadId(thread.id);

      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('id, sender_id, body, created_at')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });

      if (!ativo) return;
      setMensagens(msgs ?? []);
      setCarregando(false);

      const canal = supabase
        .channel(`chat-${thread.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${thread.id}` },
          (payload) => {
            setMensagens((atual) => [...atual, payload.new as Mensagem]);
          },
        )
        .subscribe();

      return () => {
        supabase?.removeChannel(canal);
      };
    })();

    return () => {
      ativo = false;
    };
  }, [orderId]);

  useEffect(() => {
    fimDaLista.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !threadId || !texto.trim()) return;
    const corpo = texto.trim();
    setTexto('');
    await supabase.from('chat_messages').insert({ thread_id: threadId, sender_id: meuId, body: corpo });
  }

  if (carregando) return <p className="text-sm text-tinta-50">Carregando conversa…</p>;
  if (!threadId) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-xl border border-tinta-10 p-3">
        {mensagens.length === 0 && <p className="text-sm text-tinta-50">Nenhuma mensagem ainda.</p>}
        {mensagens.map((m) => {
          const minha = m.sender_id === meuId;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                minha ? 'self-end bg-tinta-solida text-white' : 'self-start bg-tinta-5 text-tinta'
              }`}
            >
              {m.body}
            </div>
          );
        })}
        <div ref={fimDaLista} />
      </div>
      <form onSubmit={enviar} className="flex gap-2">
        <input
          className="campo"
          placeholder="Escreva uma mensagem"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Mensagem"
        />
        <button className="btn-primario !px-5" disabled={!texto.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
