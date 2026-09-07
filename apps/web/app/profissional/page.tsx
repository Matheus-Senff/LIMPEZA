'use client';

import Link from 'next/link';
import { Cabecalho } from '@/components/Cabecalho';
import { Rodape } from '@/components/Rodape';

export default function Profissional() {
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
              Agenda própria, sem exclusividade, com seguro de acidentes pessoais durante o
              deslocamento e o serviço.
            </p>
          </div>
        </section>

        <div className="container-app max-w-2xl py-10">
          <section className="cartao p-8">
            <h2 className="text-2xl font-extrabold tracking-tight">Cadastro de profissional</h2>
            <p className="mt-2 text-sm text-tinta-50">
              Cadastro simples, análise em até 3 dias úteis.
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
      </main>
      <Rodape />
    </>
  );
}
