'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Mensagem {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

const FUSO = 'America/Sao_Paulo';

function diaISO(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date(iso));
}

function rotuloDia(iso: string) {
  const hoje = diaISO(new Date().toISOString());
  const ontem = diaISO(new Date(Date.now() - 86400000).toISOString());
  const dia = diaISO(iso);
  if (dia === hoje) return 'Hoje';
  if (dia === ontem) return 'Ontem';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: 'long' }).format(new Date(iso));
}

function horaMensagem(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function Chat({
  orderId,
  meuId,
  meuNome,
  outroNome,
}: {
  orderId: string;
  meuId: string;
  meuNome: string;
  outroNome: string;
}) {
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

  let diaAnterior: string | null = null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-[55vh] min-h-[10rem] flex-col gap-1 overflow-y-auto rounded-xl border border-tinta-10 p-3">
        {mensagens.length === 0 && <p className="text-sm text-tinta-50">Nenhuma mensagem ainda.</p>}
        {mensagens.map((m) => {
          const minha = m.sender_id === meuId;
          const dia = diaISO(m.created_at);
          const mostrarDivisorDia = dia !== diaAnterior;
          diaAnterior = dia;
          return (
            <div key={m.id} className="flex flex-col">
              {mostrarDivisorDia && (
                <p className="my-2 text-center text-[11px] font-bold uppercase tracking-wide text-tinta-30">
                  {rotuloDia(m.created_at)}
                </p>
              )}
              <div className={`flex max-w-[80%] flex-col gap-0.5 ${minha ? 'self-end items-end' : 'self-start items-start'}`}>
                <span className="px-1 text-[11px] font-bold text-tinta-50">{minha ? meuNome : outroNome}</span>
                <div
                  className={`rounded-xl px-3 py-2 text-sm ${
                    minha ? 'bg-tinta-solida text-white' : 'bg-tinta-5 text-tinta'
                  }`}
                >
                  {m.body}
                </div>
                <span className="px-1 text-[10px] text-tinta-30 numero">{horaMensagem(m.created_at)}</span>
              </div>
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
