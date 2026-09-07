import Link from 'next/link';
import { Cabecalho } from '@/components/Cabecalho';
import { Rodape } from '@/components/Rodape';
import { GradeServicos } from '@/components/GradeServicos';
import { Ilustracao } from '@/components/Marca';
import { PLANOS } from '@/lib/catalogo';

const PASSOS = [
  {
    n: '1º passo',
    titulo: 'Escolha o serviço, a data e a hora',
    texto: 'Diga o que precisa e quantas horas quer contratar.',
    cor: 'bg-azul-600',
  },
  {
    n: '2º passo',
    titulo: 'Escolha a forma de pagamento',
    texto: 'Pix cobra na hora. Cartão cobra depois do serviço concluído.',
    cor: 'bg-verde-600',
  },
  {
    n: '3º passo',
    titulo: 'Deixe o resto com a gente',
    texto: 'Encontramos o profissional e avisamos você pelo app.',
    cor: 'bg-vermelho-600',
  },
];

const BENEFICIOS_PROFISSIONAL = [
  { titulo: 'Seguro de acidentes pessoais', texto: 'Cobertura na ida, durante o serviço e na volta para casa.', cor: 'bg-verde-50 text-verde-700' },
  { titulo: 'Qualidade', texto: 'Capacitação online e presencial, com incentivos para quem atende melhor.', cor: 'bg-azul-50 text-azul-700' },
  { titulo: 'Organização financeira', texto: 'Agenda, projeção de ganhos e antecipação de recebíveis no app.', cor: 'bg-amarelo-50 text-amarelo-700' },
  { titulo: 'Bônus por fidelização', texto: 'Quem fideliza e segue atendendo o mesmo cliente ganha mais por diária.', cor: 'bg-vermelho-50 text-vermelho-700' },
];

export default function Home() {
  return (
    <>
      <Cabecalho />
      <main>
        {/* ---------------------------------------------------------- herói */}
        <section className="relative overflow-hidden border-b border-tinta-20 bg-tinta-5">
          <div className="container-app grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
            <div className="flex flex-col gap-6">
              <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Serviços domésticos com <span className="text-azul-600">praticidade</span> e{' '}
                <span className="text-verde-600">qualidade</span>
              </h1>
              <p className="max-w-lg text-lg text-tinta-70">
                Faxina, passadoria, montagem de móveis e assistência residencial com profissionais
                credenciados e segurados. O preço que aparece na tela é o preço cobrado.
              </p>
              <ul className="flex flex-col gap-2.5">
                {[
                  'Profissionais aprovados e segurados contra acidentes pessoais',
                  'Preço fechado antes de você criar conta',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] text-tinta-70">
                    <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-verde-600" aria-hidden="true">
                      <circle cx="10" cy="10" r="10" fill="currentColor" opacity=".14" />
                      <path d="M6 10.4l2.6 2.6L14 7.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/contratar/padrao" className="btn-primario">Ver preço agora</Link>
                <Link href="#planos" className="btn-contorno">Conhecer as assinaturas</Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-amarelo-400/40 blur-2xl" aria-hidden="true" />
              <div className="absolute -bottom-8 -right-4 h-28 w-28 rounded-full bg-azul-200/60 blur-2xl" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-[28px] border border-tinta-20 bg-white shadow-flutuante">
                <Ilustracao tipo="app" />
              </div>
            </div>
          </div>
        </section>

        <GradeServicos />

        {/* ------------------------------------------------------ 3 passos */}
        <section className="bg-tinta py-20 text-white">
          <div className="container-app">
            <p className="rotulo mb-2 text-amarelo-400">Como contratar</p>
            <h2 className="mb-10 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Três passos até a sua casa limpa
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {PASSOS.map((p) => (
                <div key={p.n} className="flex flex-col gap-4 rounded-card bg-white/[.06] p-7">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${p.cor} text-sm font-extrabold`}>
                    {p.n.charAt(0)}
                  </span>
                  <p className="rotulo text-white/50">{p.n}</p>
                  <h3 className="text-xl font-bold leading-tight">{p.titulo}</h3>
                  <p className="text-sm text-white/70">{p.texto}</p>
                </div>
              ))}
            </div>
            <Link href="/contratar/padrao" className="btn-verde mt-10">Agendar serviço</Link>
          </div>
        </section>

        {/* -------------------------------------------- assistência 24h */}
        <section className="container-app py-20">
          <div className="grid items-center gap-10 rounded-[28px] border border-vermelho-100 bg-vermelho-50 p-8 sm:p-12 lg:grid-cols-[1fr_.8fr]">
            <div className="flex flex-col gap-5">
              <p className="rotulo text-vermelho-700">Exclusivo para assinantes</p>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Casa sempre limpa e assistida
              </h2>
              <p className="max-w-xl text-tinta-70">
                Chaveiro, encanador, eletricista ou vidraceiro em emergências, sem custo adicional.
              </p>
              <ul className="grid gap-3 sm:grid-cols-3">
                {['Suporte por telefone', 'Emergências 24h', 'Consultoria especializada'].map((b) => (
                  <li key={b} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold">{b}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link href="/contratar/padrao?frequency=weekly" className="btn-primario">Assinar plano</Link>
                <Link href="/contratar/assistencia" className="btn-contorno !border-vermelho-600 !text-vermelho-700 hover:!bg-white">
                  Preciso agora, sem assinar
                </Link>
              </div>
            </div>
            <div className="mx-auto w-full max-w-xs overflow-hidden rounded-[22px] border border-vermelho-100 bg-white">
              <Ilustracao tipo="assistencia" />
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- planos */}
        <section id="planos" className="scroll-mt-20 bg-tinta-5 py-20">
          <div className="container-app">
            <p className="rotulo mb-2 text-azul-600">Assinaturas</p>
            <h2 className="mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Conheça nossos planos</h2>
            <p className="mb-10 max-w-2xl text-tinta-50">
              Quanto mais frequente o serviço, menor o valor da diária.
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PLANOS.map((p) => {
                const destaque = p.code === 'WEEKLY';
                return (
                  <article
                    key={p.code}
                    className={`relative flex flex-col gap-4 rounded-card border bg-white p-6 ${
                      destaque ? 'border-azul-600 shadow-flutuante' : 'border-tinta-20 shadow-cartao'
                    }`}
                  >
                    {p.selo && (
                      <span className="absolute -top-3 left-6 rounded-full bg-amarelo-400 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide">
                        {p.selo}
                      </span>
                    )}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-tinta-50">{p.titulo}</p>
                      <h3 className="text-2xl font-extrabold tracking-tight">{p.subtitulo}</h3>
                    </div>
                    <ul className="flex flex-1 flex-col gap-2.5 text-sm text-tinta-70">
                      {p.beneficios.map((b) => (
                        <li key={b} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-verde-500" />
                          {b}
                        </li>
                      ))}
                      {p.ausentes.map((b) => (
                        <li key={b} className="flex gap-2 text-tinta-20">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-tinta-20" />
                          <span className="line-through">{b}</span>
                        </li>
                      ))}
                      {p.assistencia && (
                        <li className="mt-1 rounded-lg bg-vermelho-50 px-3 py-2 text-xs font-bold text-vermelho-700">
                          {p.assistencia}
                        </li>
                      )}
                    </ul>
                    <Link
                      href={`/contratar/padrao?frequency=${p.code.toLowerCase()}`}
                      className={destaque ? 'btn-primario w-full !py-2.5 !text-xs' : 'btn-contorno w-full !py-2.5 !text-xs'}
                    >
                      Quero este plano
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- profissionais */}
        <section className="container-app py-20">
          <div className="mb-10 max-w-2xl">
            <p className="rotulo mb-2 text-verde-600">Quem faz acontecer</p>
            <h2 className="mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Profissionais com benefícios de verdade
            </h2>
            <p className="text-tinta-50">
              Profissionais autônomos, com agenda própria e sem exclusividade.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFICIOS_PROFISSIONAL.map((b) => (
              <div key={b.titulo} className="cartao flex flex-col gap-3 p-6">
                <span className={`w-fit rounded-lg px-3 py-1 text-xs font-bold ${b.cor}`}>{b.titulo}</span>
                <p className="text-sm text-tinta-50">{b.texto}</p>
              </div>
            ))}
          </div>
          <Link href="/profissional" className="btn-verde mt-10">Quero me cadastrar</Link>
        </section>

        {/* ---------------------------------------------------------- final */}
        <section className="container-app py-20">
          <div className="flex flex-col items-center gap-6 rounded-[28px] bg-azul-600 px-8 py-16 text-center text-white">
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Veja quanto custa a sua faxina em menos de um minuto
            </h2>
            <p className="max-w-xl text-white/80">Informe o CEP e o preço aparece na hora.</p>
            <Link href="/contratar/padrao" className="btn bg-white text-azul-700 hover:bg-amarelo-400 hover:text-tinta">
              Ver preço agora
            </Link>
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}
