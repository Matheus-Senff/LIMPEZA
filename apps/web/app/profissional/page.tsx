'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Cabecalho } from '@/components/Cabecalho';
import { Rodape } from '@/components/Rodape';
import { reais } from '@/lib/catalogo';

const OFERTAS = [
  { id: 'A31F', servico: 'Limpeza Padrão', bairro: 'Vila Mariana', quando: 'Amanhã, 08:00 - 12:00', minutos: 240, repasse: 8800, distancia: '2,4 km', recorrente: false },
  { id: 'B77C', servico: 'Limpeza Pesada', bairro: 'Pinheiros', quando: 'Quinta, 09:00 - 15:00', minutos: 360, repasse: 13200, distancia: '5,1 km', recorrente: true },
  { id: 'C09D', servico: 'Passadoria', bairro: 'Moema', quando: 'Sexta, 14:00 - 17:00', minutos: 180, repasse: 7000, distancia: '3,8 km', recorrente: false },
];

const AGENDA = [
  { dia: 'Hoje', servico: 'Limpeza Padrão · Itaim', hora: '13:00 - 17:00', status: 'em andamento', cor: 'bg-verde-50 text-verde-700' },
  { dia: 'Amanhã', servico: 'Limpeza Padrão · Perdizes', hora: '08:00 - 12:00', status: 'confirmado', cor: 'bg-azul-50 text-azul-700' },
  { dia: 'Sábado', servico: 'Limpeza Pesada · Lapa', hora: '09:00 - 15:00', status: 'assinante', cor: 'bg-amarelo-50 text-amarelo-700' },
];

export default function Profissional() {
  const [aba, setAba] = useState<'painel' | 'cadastro'>('painel');

  return (
    <>
      <Cabecalho />
      <main className="bg-tinta-5 pb-16">
        <section className="border-b border-tinta-20 bg-tinta py-14 text-white">
          <div className="container-app">
            <p className="rotulo mb-2 text-amarelo-400">App do profissional</p>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight">
              Sua agenda, seus ganhos e sua segurança em um só lugar
            </h1>
            <p className="mt-4 max-w-xl text-white/70">
              Agenda própria, sem exclusividade. Seguro de acidentes pessoais durante o deslocamento e
              o serviço. Bônus por fidelização quando o cliente pede você de volta.
            </p>
            <div className="mt-7 inline-flex rounded-full bg-white/10 p-1">
              {(['painel', 'cadastro'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAba(a)}
                  className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wide transition ${
                    aba === a ? 'bg-white text-tinta' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {a === 'painel' ? 'Painel' : 'Quero me cadastrar'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {aba === 'painel' ? (
          <div className="container-app grid gap-5 py-10 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-5">
              <section className="cartao p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">Ofertas para você</h2>
                  <span className="rounded-full bg-vermelho-50 px-3 py-1 text-xs font-bold text-vermelho-700">
                    expiram em 10 min
                  </span>
                </div>
                <ul className="flex flex-col gap-3">
                  {OFERTAS.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-tinta-20 p-4">
                      <div>
                        <p className="font-bold">
                          {o.servico}
                          {o.recorrente && (
                            <span className="ml-2 rounded-full bg-amarelo-400 px-2 py-0.5 text-[10px] font-extrabold uppercase text-tinta">
                              assinante
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-tinta-50 numero">
                          {o.bairro} · {o.distancia} · {o.quando}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-verde-700 numero">{reais(o.repasse)}</p>
                        <p className="text-[11px] text-tinta-50 numero">{o.minutos / 60}h de serviço</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-verde !px-4 !py-2 !text-[11px]">Aceitar</button>
                        <button className="btn-contorno !border-tinta-20 !px-4 !py-2 !text-[11px] !text-tinta-50">
                          Recusar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-tinta-50">
                  O endereço completo aparece só depois do aceite. O telefone do cliente nunca é exposto —
                  a conversa acontece no chat do app.
                </p>
              </section>

              <section className="cartao p-6">
                <h2 className="mb-4 text-lg font-bold">Sua agenda</h2>
                <ul className="flex flex-col divide-y divide-tinta-20">
                  {AGENDA.map((a) => (
                    <li key={a.servico} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div>
                        <p className="font-bold">{a.servico}</p>
                        <p className="text-xs text-tinta-50 numero">
                          {a.dia} · {a.hora}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${a.cor}`}>{a.status}</span>
                      <button className="btn-primario !px-4 !py-2 !text-[11px]">
                        {a.status === 'em andamento' ? 'Fazer check-out' : 'Ver detalhes'}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <aside className="flex flex-col gap-5">
              <section className="cartao p-6">
                <p className="rotulo">Saldo a receber</p>
                <p className="text-3xl font-extrabold text-verde-700 numero">{reais(48600)}</p>
                <p className="mt-1 text-xs text-tinta-50">disponível em D+2 após cada check-out</p>
                <div className="mt-4 flex flex-col gap-2 border-t border-tinta-20 pt-4 text-sm">
                  <span className="flex justify-between">
                    <span className="text-tinta-50">Repasse base</span>
                    <b className="numero">{reais(44200)}</b>
                  </span>
                  <span className="flex justify-between">
                    <span className="text-tinta-50">Bônus de fidelização</span>
                    <b className="text-amarelo-700 numero">{reais(4400)}</b>
                  </span>
                </div>
                <button className="btn-contorno mt-4 w-full !py-2.5 !text-xs">Antecipar recebíveis</button>
              </section>

              <section className="cartao p-6">
                <p className="rotulo">Sua qualidade</p>
                <p className="mt-1 text-3xl font-extrabold numero">4,86</p>
                <p className="text-xs text-tinta-50">meta mínima da plataforma: 4,60</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-tinta-10">
                  <div className="h-full rounded-full bg-verde-500" style={{ width: '97%' }} />
                </div>
                <p className="mt-4 rounded-lg bg-verde-50 px-3 py-2 text-xs font-semibold text-verde-700">
                  Seguro de acidentes pessoais ativo
                </p>
              </section>
            </aside>
          </div>
        ) : (
          <div className="container-app max-w-2xl py-10">
            <section className="cartao p-8">
              <h2 className="text-2xl font-extrabold tracking-tight">Cadastro de profissional</h2>
              <p className="mt-2 text-sm text-tinta-50">
                Cadastro simples, análise em até 3 dias úteis. Depois da aprovação, o seguro é ativado
                e você já pode aceitar serviços.
              </p>
              <form className="mt-6 flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="campo" placeholder="Nome completo" aria-label="Nome completo" />
                  <input className="campo" placeholder="CPF" aria-label="CPF" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="campo" placeholder="Celular com DDD" aria-label="Celular" />
                  <input className="campo" placeholder="CEP de onde você sai" aria-label="CEP" />
                </div>
                <fieldset className="rounded-xl border border-tinta-20 p-4">
                  <legend className="rotulo px-2">O que você atende</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {['Limpeza padrão', 'Limpeza pesada', 'Passadoria', 'Montagem de móveis', 'Pós-obra', 'Comercial'].map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="h-4 w-4 accent-[#1546c8]" />
                        {s}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button className="btn-verde w-full">Enviar cadastro</button>
                <p className="text-center text-xs text-tinta-50">
                  Ao enviar, você concorda em passar por checagem de antecedentes e verificação de documentos.
                </p>
              </form>
            </section>
            <p className="mt-6 text-center text-sm text-tinta-50">
              Já é cadastrado?{' '}
              <Link href="/autenticar" className="font-semibold text-azul-600">
                Entrar no app
              </Link>
            </p>
          </div>
        )}
      </main>
      <Rodape />
    </>
  );
}
