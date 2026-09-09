'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  OPCIONAIS,
  PLANOS,
  SERVICOS,
  horas,
  reais,
  type FrequencyCode,
  type Servico,
} from '@/lib/catalogo';
import { RULESET_PADRAO } from '@/lib/rulesetPadrao';
import { priceGrid, quote } from '@/lib/pricing';
import type { Ruleset } from '@/lib/pricing/types';
import { faixaDaJanela, janelasDoDia, proximosDias, rotuloData } from '@/lib/agenda';
import { supabase } from '@/lib/supabase';
import { IconeServico, type TipoIcone } from './Marca';
import { Contador } from './Contador';

type Passo = 1 | 2 | 3 | 4 | 5 | 6;
type TipoLar = 'HOUSE' | 'APARTMENT' | 'STUDIO';

const TIPOS: { code: TipoLar; nome: string }[] = [
  { code: 'HOUSE', nome: 'Casa' },
  { code: 'APARTMENT', nome: 'Apartamento' },
  { code: 'STUDIO', nome: 'Studio' },
];

interface PerfilCliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
}

interface EnderecoSalvo {
  id: string;
  label: string | null;
  street: string;
  number: string;
  complement: string | null;
}

export function Funil({
  servico,
  frequenciaInicial,
  perfil,
}: {
  servico: Servico;
  frequenciaInicial?: string;
  perfil: PerfilCliente;
}) {
  const router = useRouter();

  // ---------------------------------------------------------------- estado
  const [passo, setPasso] = useState<Passo>(1);
  const [maxPasso, setMaxPasso] = useState<Passo>(1);
  const [tipoLar, setTipoLar] = useState<TipoLar>('APARTMENT');
  const [quartos, setQuartos] = useState(2);
  const [banheiros, setBanheiros] = useState(1);
  const [cep, setCep] = useState('');
  const [erroCep, setErroCep] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const [ruleset, setRuleset] = useState<Ruleset>(RULESET_PADRAO);
  const [cidade, setCidade] = useState<string | null>(null);
  const [uf, setUf] = useState<string | null>(null);
  const [bairro, setBairro] = useState<string | null>(null);

  const [opcionais, setOpcionais] = useState<string[]>([]);
  const [minutosBase, setMinutosBase] = useState(servico.sugeridoMinutos);

  const [frequencia, setFrequencia] = useState<FrequencyCode>(
    (frequenciaInicial?.toUpperCase() as FrequencyCode) || 'SINGLE',
  );
  const [dia, setDia] = useState<string | null>(null);
  const [janela, setJanela] = useState<string | null>(null);
  const [verMaisDias, setVerMaisDias] = useState(false);

  const [nome, setNome] = useState(perfil.nome);
  const [telefone, setTelefone] = useState(perfil.telefone);
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [acesso, setAcesso] = useState('');
  const [enderecosSalvos, setEnderecosSalvos] = useState<EnderecoSalvo[]>([]);
  const [metodo, setMetodo] = useState<'pix' | 'credit_card'>('pix');
  const [pedido, setPedido] = useState<{ codigo: string; simulado?: boolean } | null>(null);

  const areaPasso2 = useRef<HTMLDivElement>(null);
  const areaPasso3 = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------- derivados
  const opcionaisDoServico = useMemo(
    () => OPCIONAIS.filter((o) => o.servicos.includes(servico.code)),
    [servico.code],
  );

  const minutosTotais = useMemo(() => {
    const extra = opcionais.reduce(
      (s, code) => s + (OPCIONAIS.find((o) => o.code === code)?.minutos ?? 0),
      0,
    );
    return Math.min(minutosBase + extra, ruleset.limits.maxMinutes);
  }, [opcionais, minutosBase, ruleset.limits.maxMinutes]);

  const entradaPreco = useMemo(
    () => ({
      service: servico.code,
      minutes: minutosBase,
      addons: opcionais.map((code) => {
        const o = OPCIONAIS.find((x) => x.code === code)!;
        return { code: o.code, name: o.nome, extraMinutes: o.minutos };
      }),
      frequency: frequencia,
      homeType: tipoLar,
      bedrooms: quartos,
      bathrooms: banheiros,
    }),
    [servico.code, minutosBase, opcionais, frequencia, tipoLar, quartos, banheiros],
  );

  const preco = useMemo(() => {
    try {
      return quote({ ...entradaPreco, scheduledAt: janela ?? undefined }, ruleset).priceCents;
    } catch {
      return null;
    }
  }, [entradaPreco, janela, ruleset]);

  const precoAvulso = useMemo(() => {
    try {
      return quote({ ...entradaPreco, frequency: 'SINGLE', scheduledAt: janela ?? undefined }, ruleset)
        .priceCents;
    } catch {
      return null;
    }
  }, [entradaPreco, janela, ruleset]);

  const dias = useMemo(() => proximosDias(verMaisDias ? 21 : 3), [verMaisDias]);

  const janelas = useMemo(
    () => (dia ? janelasDoDia(dia, minutosTotais, ruleset) : []),
    [dia, minutosTotais, ruleset],
  );

  const grade = useMemo(() => {
    if (!janelas.length) return [];
    return priceGrid(entradaPreco, janelas, ruleset);
  }, [janelas, entradaPreco, ruleset]);

  const precoPorFrequencia = useCallback(
    (code: FrequencyCode) => {
      try {
        return quote({ ...entradaPreco, frequency: code, scheduledAt: janela ?? undefined }, ruleset)
          .priceCents;
      } catch {
        return null;
      }
    },
    [entradaPreco, janela, ruleset],
  );

  // --------------------------------------------------------------- efeitos
  useEffect(() => {
    setMinutosBase(servico.sugeridoMinutos);
    setOpcionais([]);
  }, [servico.sugeridoMinutos, servico.code]);

  useEffect(() => {
    // Trocar a duração pode invalidar a janela escolhida.
    if (janela && !janelas.includes(janela)) setJanela(null);
  }, [janelas, janela]);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from('addresses')
        .select('id, label, street, number, complement')
        .eq('customer_id', perfil.id)
        .eq('active', true)
        .order('created_at', { ascending: false });
      setEnderecosSalvos(data ?? []);
    })();
  }, [perfil.id]);

  const avancarPara = (p: Passo, ref?: React.RefObject<HTMLDivElement | null>) => {
    setPasso(p);
    setMaxPasso((m) => (p > m ? p : m));
    setTimeout(() => ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  // ------------------------------------------------------------ ações
  async function verPreco(e: React.FormEvent) {
    e.preventDefault();
    setErroCep(null);
    setCarregando(true);
    try {
      const r = await fetch('/api/cobertura', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ zipcode: cep, service: servico.code, email: perfil.email }),
      }).then((x) => x.json());

      if (!r.coberto) {
        setErroCep(r.mensagem ?? 'CEP fora da área de atendimento.');
        return;
      }
      setRuleset(r.ruleset as Ruleset);
      setCidade(r.cidade ?? null);
      setUf(r.estado ?? null);
      setBairro(r.bairro ?? null);
      avancarPara(2, areaPasso2);
    } catch {
      setErroCep('Não conseguimos validar seu CEP agora. Tente de novo em instantes.');
    } finally {
      setCarregando(false);
    }
  }

  async function finalizar() {
    setCarregando(true);
    try {
      const { data: sessao } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const token = sessao.session?.access_token;
      const authHeaders: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};

      const cotacao = await fetch('/api/cotacao', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          zipcode: cep,
          service: servico.code,
          frequency: frequencia,
          minutes: minutosBase,
          addons: opcionais,
          scheduledAt: janela,
          homeType: tipoLar,
          bedrooms: quartos,
          bathrooms: banheiros,
        }),
      }).then((x) => x.json());

      const r = await fetch('/api/pedido', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          quoteId: cotacao.quoteId,
          metodo,
          cliente: { nome, email: perfil.email, telefone },
          endereco: {
            cep,
            rua,
            numero,
            complemento,
            acesso,
            cidade,
            estado: uf,
            bairro,
            homeType: tipoLar,
            bedrooms: quartos,
            bathrooms: banheiros,
          },
        }),
      }).then((x) => x.json());

      setPedido({ codigo: r.codigo, simulado: r.simulado });
    } finally {
      setCarregando(false);
    }
  }

  // ------------------------------------------------------- pedido fechado
  if (pedido) {
    return <PedidoConfirmado pedido={pedido} janela={janela} minutos={minutosTotais} preco={preco} />;
  }

  const Cabecalho = ({ n, titulo, ativo }: { n: Passo; titulo: string; ativo: boolean }) => (
    <button
      onClick={() => n <= maxPasso && setPasso(n)}
      disabled={n > maxPasso}
      className="flex w-full items-center gap-3 text-left disabled:cursor-not-allowed"
    >
      <span
        className={`numero flex h-7 shrink-0 items-center justify-center rounded-full px-2.5 text-xs font-extrabold leading-none ${
          ativo ? 'bg-azul-600 text-white' : n <= maxPasso ? 'bg-azul-50 text-azul-700' : 'bg-tinta-10 text-tinta-50'
        }`}
      >
        {n}/6
      </span>
      <span className={`text-lg font-bold ${ativo ? 'text-tinta' : 'text-tinta-50'}`}>{titulo}</span>
    </button>
  );

  return (
    <div className="container-app grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
      {/* ============================================================ coluna */}
      <div className="flex flex-col gap-4">
        {/* ------------------------------------------------------- passo 1 */}
        <section className="cartao p-6">
          <Cabecalho n={1} titulo="Escolha um serviço" ativo={passo === 1} />
          {passo === 1 && (
            <div className="mt-6 flex animate-entrada flex-col gap-8">
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 sem-barra">
                {SERVICOS.filter((s) => s.code !== 'HOME_ASSISTANCE').map((s) => {
                  const ativo = s.slug === servico.slug;
                  return (
                    <button
                      key={s.slug}
                      onClick={() => router.push(`/cliente/contratar/${s.slug}`)}
                      className={`relative w-[124px] shrink-0 overflow-hidden rounded-xl border-2 text-left transition ${
                        ativo ? 'border-tinta shadow-cartao' : 'border-tinta-10 hover:border-tinta-20'
                      }`}
                    >
                      <span className="grid h-16 place-items-center">
                        <IconeServico tipo={s.slug as TipoIcone} />
                      </span>
                      <span className="block whitespace-pre-line px-2 py-2 text-[11px] font-bold leading-tight">
                        {s.nomeCurto}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl bg-tinta-5 p-4 text-sm text-tinta-70">
                {servico.descricao}
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-azul-600">
                    Ver o que está incluso
                  </summary>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <ul className="flex flex-col gap-1.5">
                      {servico.incluso.map((i) => (
                        <li key={i} className="flex gap-2 text-xs">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-verde-500" />
                          {i}
                        </li>
                      ))}
                    </ul>
                    <ul className="flex flex-col gap-1.5">
                      {servico.naoIncluso.map((i) => (
                        <li key={i} className="flex gap-2 text-xs text-tinta-50">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-tinta-20" />
                          {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              </div>

              <div>
                <h3 className="text-base font-bold">Como é seu lar?</h3>
                <p className="mb-4 text-sm text-tinta-50">
                  O tipo de lar e a quantidade de cômodos são informados ao profissional.
                </p>
                <div className="mb-5 flex flex-wrap gap-2">
                  {TIPOS.map((t) => (
                    <button
                      key={t.code}
                      onClick={() => setTipoLar(t.code)}
                      className={`rounded-full border-2 px-5 py-2 text-sm font-bold transition ${
                        tipoLar === t.code
                          ? 'border-azul-600 bg-azul-50 text-azul-700'
                          : 'border-tinta-20 text-tinta-50 hover:border-azul-200'
                      }`}
                    >
                      {t.nome}
                    </button>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Contador rotulo="quartos" valor={quartos} onChange={setQuartos} min={0} max={10} />
                  <Contador rotulo="banheiros" valor={banheiros} onChange={setBanheiros} min={1} max={10} />
                </div>
                <p className="mt-3 text-xs text-tinta-50">
                  Cozinha e sala já estão inclusos. Para lavabo, adicione banheiros; para os demais
                  cômodos, adicione quartos.
                </p>
              </div>

              <form onSubmit={verPreco} className="flex flex-col gap-3">
                <h3 className="text-base font-bold">Qual o seu CEP?</h3>
                <div className="max-w-xs">
                  <input
                    inputMode="numeric"
                    required
                    value={cep}
                    onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Qual seu CEP?"
                    className="campo"
                    aria-label="CEP"
                  />
                </div>
                {erroCep && (
                  <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">
                    {erroCep}
                  </p>
                )}
                <button type="submit" disabled={carregando} className="btn-primario w-full sm:w-auto">
                  {carregando ? 'Calculando…' : 'Ver preço'}
                </button>
              </form>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------- passo 2 */}
        <section ref={areaPasso2} className={`cartao scroll-mt-24 p-6 ${maxPasso < 2 ? 'opacity-50' : ''}`}>
          <Cabecalho n={2} titulo="Itens opcionais" ativo={passo === 2} />
          {passo === 2 && (
            <div className="mt-6 flex animate-entrada flex-col gap-6">
              <p className="text-sm text-tinta-50">
                Cada item adiciona tempo ao serviço — assim o profissional é pago pelo que realmente faz.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {opcionaisDoServico.map((o) => {
                  const ativo = opcionais.includes(o.code);
                  return (
                    <label
                      key={o.code}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-sm transition ${
                        ativo ? 'border-azul-600 bg-azul-50' : 'border-tinta-20 hover:border-azul-200'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={ativo}
                          onChange={() =>
                            setOpcionais((atual) =>
                              atual.includes(o.code)
                                ? atual.filter((c) => c !== o.code)
                                : [...atual, o.code],
                            )
                          }
                          className="h-4 w-4 accent-[#2563eb]"
                        />
                        <span className="font-semibold">{o.nome}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-superficie px-2 py-0.5 text-[11px] font-bold text-tinta-50 numero">
                        +{o.minutos}min
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="rounded-xl border border-tinta-20 p-5">
                <p className="rotulo mb-3">Ajuste de horas</p>
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setMinutosBase((m) => Math.max(servico.minMinutos, m - 30))}
                    className="grid h-11 w-11 place-items-center rounded-full border-2 border-tinta-20 text-xl font-bold hover:border-azul-600 hover:text-azul-600"
                    aria-label="Diminuir meia hora"
                  >
                    −
                  </button>
                  <div className="text-center">
                    <p className="text-2xl font-extrabold numero">{horas(minutosTotais)}</p>
                    <p className="text-xs text-tinta-50">com 1 profissional</p>
                  </div>
                  <button
                    onClick={() =>
                      setMinutosBase((m) => Math.min(ruleset.limits.maxMinutes, m + 30))
                    }
                    className="grid h-11 w-11 place-items-center rounded-full border-2 border-tinta-20 text-xl font-bold hover:border-azul-600 hover:text-azul-600"
                    aria-label="Aumentar meia hora"
                  >
                    +
                  </button>
                </div>
                <p className="mt-3 text-center text-xs text-tinta-50">
                  Sugerimos pelo menos {horas(servico.sugeridoMinutos)} para este serviço.
                </p>
              </div>

              <button onClick={() => avancarPara(3, areaPasso3)} className="btn-primario w-full sm:w-auto">
                Próximo
              </button>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------- passo 3 */}
        <section ref={areaPasso3} className={`cartao scroll-mt-24 p-6 ${maxPasso < 3 ? 'opacity-50' : ''}`}>
          <Cabecalho n={3} titulo="Frequência, data e horário" ativo={passo === 3} />
          {passo === 3 && (
            <div className="mt-6 flex animate-entrada flex-col gap-8">
              <div>
                <h3 className="text-base font-bold">Qual a frequência das diárias?</h3>
                <p className="mb-4 text-sm text-tinta-50">
                  Assinatura tem profissional recorrente, prioridade na agenda e assistência residencial.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {PLANOS.map((p) => {
                    const ativo = frequencia === p.code;
                    const valor = precoPorFrequencia(p.code);
                    const economia =
                      precoAvulso && valor && p.code !== 'SINGLE'
                        ? Math.round((1 - valor / precoAvulso) * 100)
                        : 0;
                    return (
                      <button
                        key={p.code}
                        onClick={() => setFrequencia(p.code)}
                        className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition ${
                          ativo ? 'border-azul-600 bg-azul-50' : 'border-tinta-20 hover:border-azul-200'
                        }`}
                      >
                        {economia > 0 && (
                          <span className="absolute -top-2.5 right-3 rounded-full bg-verde-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                            {economia}% OFF
                          </span>
                        )}
                        <span className="text-[11px] font-bold uppercase tracking-wide text-tinta-50">
                          {p.titulo}
                        </span>
                        <span className="text-lg font-extrabold leading-none">{p.subtitulo}</span>
                        {valor !== null && (
                          <span className="text-sm font-bold text-verde-700 numero">{reais(valor)}</span>
                        )}
                        {p.assistencia && (
                          <span className="text-[11px] font-semibold text-azul-700">{p.assistencia}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold">Escolha a data</h3>
                <div className="mb-2 mt-1 flex items-center gap-2 rounded-lg bg-tinta-5 px-3 py-2 text-xs font-semibold text-tinta">
                  <span className="h-2 w-2 rounded-full bg-tinta" />
                  Serviço para hoje disponível por um custo adicional.
                </div>
                <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2 sem-barra">
                  {dias.map((d) => {
                    const ativo = dia === d.iso;
                    return (
                      <button
                        key={d.iso}
                        onClick={() => {
                          setDia(d.iso);
                          setJanela(null);
                        }}
                        className={`flex w-[68px] shrink-0 flex-col items-center rounded-xl border-2 py-3 transition ${
                          ativo
                            ? 'border-azul-600 bg-azul-600 text-white'
                            : 'border-tinta-20 hover:border-azul-200'
                        } ${d.hoje && !ativo ? 'border-azul-100 bg-azul-50' : ''}`}
                      >
                        <span className="text-[11px] font-bold uppercase">{d.diaSemana}</span>
                        <span className="text-xl font-extrabold numero">{d.diaMes}</span>
                        <span className="text-[10px] opacity-70">{d.mes}</span>
                      </button>
                    );
                  })}
                  {!verMaisDias && (
                    <button
                      onClick={() => setVerMaisDias(true)}
                      className="w-[68px] shrink-0 rounded-xl border-2 border-dashed border-tinta-20 text-xs font-bold text-azul-600"
                    >
                      Ver mais
                    </button>
                  )}
                </div>
              </div>

              {dia && (
                <div className="animate-entrada">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold">
                      Horário · {rotuloData(dia).diaSemana}, {rotuloData(dia).extenso}
                    </h3>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-verde-700">
                      <span className="h-2 w-2 rounded-full bg-verde-500" />
                      opções mais baratas
                    </span>
                  </div>
                  {grade.length === 0 ? (
                    <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm text-tinta-70">
                      Não há mais janelas para este dia com {horas(minutosTotais)} de serviço. Escolha
                      outra data ou reduza as horas.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {grade.map((g) => {
                        const ativo = janela === g.slot;
                        return (
                          <button
                            key={g.slot}
                            onClick={() => setJanela(g.slot)}
                            className={`relative rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition numero ${
                              ativo
                                ? 'border-azul-600 bg-azul-600 text-white'
                                : g.cheapest
                                  ? 'border-verde-100 bg-verde-50 text-verde-700 hover:border-verde-500'
                                  : 'border-tinta-20 hover:border-azul-200'
                            }`}
                          >
                            {faixaDaJanela(g.slot, minutosTotais)}
                            <span className={`block text-[11px] font-semibold ${ativo ? 'text-white/80' : 'text-tinta-50'}`}>
                              {reais(g.priceCents)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => avancarPara(4)}
                disabled={!janela}
                className="btn-primario w-full sm:w-auto"
              >
                Avançar
              </button>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------- passo 4 */}
        <section className={`cartao p-6 ${maxPasso < 4 ? 'opacity-50' : ''}`}>
          <Cabecalho n={4} titulo="Seus dados" ativo={passo === 4} />
          {passo === 4 && (
            <div className="mt-6 flex animate-entrada flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="campo" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome completo" />
                <input className="campo" placeholder="Celular com DDD" value={telefone} onChange={(e) => setTelefone(e.target.value)} aria-label="Celular" />
              </div>
              <p className="text-xs text-tinta-50">
                Usamos o celular só para avisar sobre o serviço. O profissional fala com você pelo chat
                do app — seu telefone nunca é exposto.
              </p>
              <button onClick={() => avancarPara(5)} disabled={!nome || !telefone} className="btn-primario w-full sm:w-auto">
                Continuar
              </button>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------- passo 5 */}
        <section className={`cartao p-6 ${maxPasso < 5 ? 'opacity-50' : ''}`}>
          <Cabecalho n={5} titulo="Endereço e acesso" ativo={passo === 5} />
          {passo === 5 && (
            <div className="mt-6 flex animate-entrada flex-col gap-4">
              {enderecosSalvos.length > 0 && (
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sem-barra">
                  {enderecosSalvos.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        setRua(e.street);
                        setNumero(e.number);
                        setComplemento(e.complement ?? '');
                      }}
                      className="shrink-0 rounded-xl border-2 border-tinta-20 px-4 py-2 text-left text-xs font-semibold hover:border-tinta-50"
                    >
                      {e.label ?? `${e.street}, ${e.number}`}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <input className="campo" placeholder="Rua" value={rua} onChange={(e) => setRua(e.target.value)} aria-label="Rua" />
                <input className="campo" placeholder="Número" value={numero} onChange={(e) => setNumero(e.target.value)} aria-label="Número" />
              </div>
              <input className="campo" placeholder="Complemento (bloco, apto)" value={complemento} onChange={(e) => setComplemento(e.target.value)} aria-label="Complemento" />
              <textarea
                className="campo min-h-[90px]"
                placeholder="Como o profissional entra? Portaria, chave com o vizinho, cachorro em casa…"
                value={acesso}
                onChange={(e) => setAcesso(e.target.value)}
                aria-label="Instruções de acesso"
              />
              <p className="text-xs text-tinta-50">
                O endereço completo só é liberado para o profissional depois que ele aceita o serviço.
              </p>
              <button onClick={() => avancarPara(6)} disabled={!rua || !numero} className="btn-primario w-full sm:w-auto">
                Ir para o pagamento
              </button>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------- passo 6 */}
        <section className={`cartao p-6 ${maxPasso < 6 ? 'opacity-50' : ''}`}>
          <Cabecalho n={6} titulo="Pagamento" ativo={passo === 6} />
          {passo === 6 && (
            <div className="mt-6 flex animate-entrada flex-col gap-4">
              {(
                [
                  {
                    code: 'pix' as const,
                    titulo: 'Pix',
                    texto: 'Pagamento no momento do pedido. A vaga é reservada na hora.',
                  },
                  {
                    code: 'credit_card' as const,
                    titulo: 'Cartão de crédito',
                    texto: 'Autorizamos agora e só cobramos depois que o serviço for concluído.',
                  },
                ]
              ).map((m) => (
                <label
                  key={m.code}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                    metodo === m.code ? 'border-azul-600 bg-azul-50' : 'border-tinta-20 hover:border-azul-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="metodo"
                    checked={metodo === m.code}
                    onChange={() => setMetodo(m.code)}
                    className="mt-1 h-4 w-4 accent-[#2563eb]"
                  />
                  <span>
                    <span className="block font-bold">{m.titulo}</span>
                    <span className="block text-sm text-tinta-50">{m.texto}</span>
                  </span>
                </label>
              ))}

              <div className="rounded-xl bg-tinta-5 px-4 py-3 text-xs font-semibold text-tinta-70">
                Pagamento simulado nesta versão: nenhuma cobrança real é feita. O pedido é registrado
                de verdade e segue para a busca de profissional.
              </div>

              <button onClick={finalizar} disabled={carregando} className="btn-verde w-full">
                {carregando ? 'Processando…' : `Confirmar e pagar ${preco ? reais(preco) : ''}`}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* =========================================================== resumo */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="cartao flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <IconeServico tipo={servico.slug as TipoIcone} className="h-11 w-11" />
            <div>
              <p className="font-bold leading-tight">{servico.nome}</p>
              <p className="text-xs text-tinta-50 numero">
                {horas(minutosTotais)} por diária{cidade ? ` · ${cidade}` : ''}
              </p>
            </div>
          </div>

          <ul className="flex flex-col gap-2 border-y border-tinta-20 py-4 text-sm">
            <li className="flex justify-between gap-3">
              <span className="text-tinta-50">Modalidade</span>
              <span className="font-semibold">
                {PLANOS.find((p) => p.code === frequencia)?.subtitulo}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-tinta-50">Imóvel</span>
              <span className="font-semibold">
                {quartos} quarto{quartos === 1 ? '' : 's'} · {banheiros} banheiro{banheiros === 1 ? '' : 's'}
              </span>
            </li>
            {opcionais.length > 0 && (
              <li className="flex justify-between gap-3">
                <span className="text-tinta-50">Opcionais</span>
                <span className="font-semibold numero">{opcionais.length}</span>
              </li>
            )}
            <li className="flex justify-between gap-3">
              <span className="text-tinta-50">Dia, Horário</span>
              <span className="font-semibold numero">
                {janela ? `${rotuloData(janela.slice(0, 10)).extenso}, ${faixaDaJanela(janela, minutosTotais)}` : 'a escolher'}
              </span>
            </li>
          </ul>

          <div>
            <p className="rotulo">Valor do serviço</p>
            <p className="text-3xl font-extrabold text-verde-700 numero">
              {preco !== null ? reais(preco) : '—'}
            </p>
            {!janela && (
              <p className="mt-1 text-xs text-tinta-50">
                Valor de referência. Ao escolher data e horário, o preço final aparece aqui.
              </p>
            )}
            {frequencia !== 'SINGLE' && precoAvulso && preco && precoAvulso > preco && (
              <p className="mt-1 text-xs font-semibold text-verde-700">
                Você economiza {reais(precoAvulso - preco)} por diária em relação à avulsa.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-xl bg-tinta-5 p-3 text-xs text-tinta-50">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-verde-500" /> Profissional credenciado e segurado
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-azul-600" /> Chat com o profissional pelo app
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-tinta-30" /> Cancelamento grátis até 24h antes
            </span>
          </div>
        </div>

        <p className="mt-4 px-2 text-xs text-tinta-50">
          Dúvidas? <Link href="/cliente/conta" className="font-semibold text-azul-600">Fale com o suporte</Link>
        </p>
      </aside>
    </div>
  );
}

function PedidoConfirmado({
  pedido,
  janela,
  minutos,
  preco,
}: {
  pedido: { codigo: string; simulado?: boolean };
  janela: string | null;
  minutos: number;
  preco: number | null;
}) {
  return (
    <div className="container-app flex max-w-2xl flex-col items-center gap-6 py-20 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-full bg-verde-50">
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-verde-600 animate-pulsar"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </span>
      </span>
      <h1 className="text-3xl font-extrabold tracking-tight">Procurando o profissional ideal</h1>
      <p className="max-w-md text-tinta-50">
        Pedido <b className="text-tinta numero">{pedido.codigo}</b> confirmado. Assim que um
        profissional aceitar, você recebe o perfil, a nota e o chat abre automaticamente.
      </p>
      <div className="cartao grid w-full gap-4 p-6 text-left sm:grid-cols-3">
        <div>
          <p className="rotulo">Dia, Horário</p>
          <p className="font-bold numero">
            {janela ? `${rotuloData(janela.slice(0, 10)).extenso}` : '—'}
          </p>
          <p className="text-sm text-tinta-50 numero">{janela ? faixaDaJanela(janela, minutos) : ''}</p>
        </div>
        <div>
          <p className="rotulo">Duração</p>
          <p className="font-bold numero">{horas(minutos)}</p>
        </div>
        <div>
          <p className="rotulo">Valor</p>
          <p className="font-bold text-verde-700 numero">{preco !== null ? reais(preco) : '—'}</p>
        </div>
      </div>
      {pedido.simulado && (
        <p className="rounded-lg bg-tinta-5 px-4 py-2 text-xs font-semibold text-tinta-70">
          Pagamento simulado: nenhuma cobrança foi feita nesta versão.
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/cliente/pedidos" className="btn-primario">Acompanhar pedido</Link>
        <Link href="/" className="btn-contorno">Voltar ao início</Link>
      </div>
    </div>
  );
}
