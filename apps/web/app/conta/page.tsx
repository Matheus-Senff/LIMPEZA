'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Cabecalho } from '@/components/Cabecalho';
import { Rodape } from '@/components/Rodape';
import { supabase } from '@/lib/supabase';
import { horas, reais } from '@/lib/catalogo';

interface Pedido {
  id: string;
  code: string;
  service: string;
  scheduled_at: string;
  minutes: number;
  status: string;
  price_cents: number;
}

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  searching_professional: { rotulo: 'Procurando profissional', classe: 'bg-amarelo-50 text-amarelo-700' },
  assigned: { rotulo: 'Profissional confirmado', classe: 'bg-azul-50 text-azul-700' },
  in_progress: { rotulo: 'Em andamento', classe: 'bg-verde-50 text-verde-700' },
  completed: { rotulo: 'Concluído', classe: 'bg-verde-50 text-verde-700' },
  rated: { rotulo: 'Avaliado', classe: 'bg-tinta-10 text-tinta-50' },
  cancelled_by_customer: { rotulo: 'Cancelado', classe: 'bg-vermelho-50 text-vermelho-700' },
};

export default function Conta() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [logado, setLogado] = useState(false);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setCarregando(false);
        return;
      }
      const { data: sessao } = await supabase.auth.getSession();
      setLogado(Boolean(sessao.session));

      const { data } = await supabase
        .from('orders')
        .select('id, code, service, scheduled_at, minutes, status, price_cents')
        .order('scheduled_at', { ascending: true })
        .limit(20);

      setPedidos(data ?? []);
      setCarregando(false);
    })();
  }, []);

  return (
    <>
      <Cabecalho />
      <main className="bg-tinta-5 pb-16">
        <div className="container-app py-10">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="rotulo mb-1 text-azul-600">Minha conta</p>
              <h1 className="text-3xl font-extrabold tracking-tight">Seus serviços</h1>
            </div>
            <Link href="/contratar/padrao" className="btn-primario">Agendar novo serviço</Link>
          </div>

          {!logado && (
            <div className="cartao mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="text-sm text-tinta-70">
                Entre com seu e-mail para ver seus pedidos, gerenciar a assinatura e falar com o
                profissional pelo chat.
              </p>
              <Link href="/autenticar" className="btn-contorno !py-2.5 !text-xs">Entrar</Link>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className="cartao p-6">
              <h2 className="mb-4 text-lg font-bold">Próximos serviços</h2>
              {carregando ? (
                <p className="text-sm text-tinta-50">Carregando…</p>
              ) : pedidos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-tinta-20 p-8 text-center">
                  <p className="font-semibold">Nenhum serviço agendado</p>
                  <p className="mt-1 text-sm text-tinta-50">
                    Quando você contratar, ele aparece aqui com status em tempo real e chat com o
                    profissional.
                  </p>
                  <Link href="/contratar/padrao" className="btn-primario mt-5 !py-2.5 !text-xs">
                    Ver preço de uma faxina
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-tinta-20">
                  {pedidos.map((p) => {
                    const s = STATUS[p.status] ?? { rotulo: p.status, classe: 'bg-tinta-10 text-tinta-50' };
                    return (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
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
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.classe}`}>{s.rotulo}</span>
                        <span className="font-bold text-verde-700 numero">{reais(p.price_cents)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div className="flex flex-col gap-5">
              <section className="cartao p-6">
                <h2 className="mb-3 text-lg font-bold">Sua assinatura</h2>
                <p className="text-sm text-tinta-50">
                  Você ainda não tem assinatura ativa. Com ela, o preço da diária cai até 20%, você
                  mantém a mesma profissional e ganha assistência residencial 24h.
                </p>
                <Link href="/contratar/padrao?frequency=weekly" className="btn-verde mt-4 w-full !py-2.5 !text-xs">
                  Ver planos
                </Link>
              </section>

              <section className="cartao p-6">
                <h2 className="mb-3 text-lg font-bold">Assistência 24h</h2>
                <p className="text-sm text-tinta-50">
                  Chaveiro, encanador, eletricista ou vidraceiro em emergências. Grátis para
                  assinantes; avulso para quem precisar agora.
                </p>
                <Link href="/contratar/assistencia" className="btn-contorno mt-4 w-full !border-vermelho-600 !py-2.5 !text-xs !text-vermelho-700">
                  Acionar assistência
                </Link>
              </section>

              <section className="cartao p-6">
                <h2 className="mb-3 text-lg font-bold">Indique e ganhe</h2>
                <p className="text-sm text-tinta-50">
                  Compartilhe seu código e ganhe crédito quando alguém contratar pela primeira vez.
                </p>
                <p className="mt-3 rounded-lg bg-tinta-5 px-4 py-3 text-center text-lg font-extrabold tracking-widest numero">
                  LIMPO2026
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Rodape />
    </>
  );
}
