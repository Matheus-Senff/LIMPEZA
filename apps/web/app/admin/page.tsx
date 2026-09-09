'use client';

import { useEffect, useMemo, useState } from 'react';
import { CabecalhoApp } from '@/components/CabecalhoApp';
import { GuardaPerfil } from '@/lib/usePerfil';
import { supabase } from '@/lib/supabase';
import { SERVICOS, horas, reais } from '@/lib/catalogo';
import { RULESET_PADRAO } from '@/lib/rulesetPadrao';
import { quote } from '@/lib/pricing';
import type { Frequency, Ruleset } from '@/lib/pricing/types';
import { proximosDias } from '@/lib/agenda';

interface Cobertura {
  id: string;
  region_code: string;
  city: string;
  state: string;
  zip_start: string;
  zip_end: string;
  active: boolean;
}

interface RegraAtiva {
  id: string;
  region_code: string;
  service: string;
  version: number;
  rules: Ruleset;
}

interface PedidoAdmin {
  id: string;
  code: string;
  service: string;
  status: string;
  scheduled_at: string;
  price_cents: number;
}

type Credenciamento = 'pending' | 'in_review' | 'approved' | 'suspended' | 'blocked';

interface ProfissionalAdmin {
  id: string;
  document: string;
  accreditation_status: Credenciamento;
  full_name: string;
}

const STATUS_PEDIDO: Record<string, string> = {
  searching_professional: 'Procurando profissional',
  assigned: 'Confirmado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  rated: 'Avaliado',
  cancelled_by_customer: 'Cancelado (cliente)',
  cancelled_by_professional: 'Cancelado (profissional)',
  no_show: 'Não compareceu',
  refunded: 'Reembolsado',
};

const STATUS_CREDENCIAMENTO: Record<Credenciamento, string> = {
  pending: 'Em análise',
  in_review: 'Documentos em verificação',
  approved: 'Aprovado',
  suspended: 'Suspenso',
  blocked: 'Bloqueado',
};

export default function Admin() {
  return (
    <GuardaPerfil papel="admin">
      <CabecalhoApp papel="admin" />
      <PainelAdmin />
    </GuardaPerfil>
  );
}

function PainelAdmin() {
  const [coberturas, setCoberturas] = useState<Cobertura[]>([]);
  const [regras, setRegras] = useState<RegraAtiva[]>([]);
  const [leads, setLeads] = useState<{ total: number; sem_cobertura: number } | null>(null);
  const [pedidos, setPedidos] = useState<PedidoAdmin[]>([]);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [profissionais, setProfissionais] = useState<ProfissionalAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);

  // simulador
  const [regiao, setRegiao] = useState('PR-SUL');
  const [servico, setServico] = useState('CLEANING');
  const [minutos, setMinutos] = useState(240);
  const [frequencia, setFrequencia] = useState<Frequency>('SINGLE');
  const [quandoIdx, setQuandoIdx] = useState(1);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setCarregando(false);
        return;
      }
      const [c, r, l, p, prof] = await Promise.all([
        supabase.from('coverage_areas').select('*').order('region_code'),
        supabase.from('pricing_rulesets').select('id, region_code, service, version, rules').eq('active', true),
        supabase.from('leads').select('covered'),
        supabase
          .from('orders')
          .select('id, code, service, status, scheduled_at, price_cents')
          .order('scheduled_at', { ascending: false })
          .limit(50),
        supabase.from('professionals').select('id, document, accreditation_status, profiles(full_name)'),
      ]);
      setCoberturas(c.data ?? []);
      setRegras((r.data as RegraAtiva[]) ?? []);
      if (l.data) {
        setLeads({
          total: l.data.length,
          sem_cobertura: l.data.filter((x: { covered: boolean }) => !x.covered).length,
        });
      }
      setPedidos(p.data ?? []);
      setProfissionais(
        ((prof.data ?? []) as unknown as { id: string; document: string; accreditation_status: Credenciamento; profiles: { full_name: string } | null }[]).map(
          (row) => ({
            id: row.id,
            document: row.document,
            accreditation_status: row.accreditation_status,
            full_name: row.profiles?.full_name ?? '—',
          }),
        ),
      );
      setCarregando(false);
    })();
  }, []);

  async function atualizarCredenciamento(id: string, status: Credenciamento) {
    if (!supabase) return;
    await supabase.from('professionals').update({ accreditation_status: status }).eq('id', id);
    setProfissionais((atual) => atual.map((p) => (p.id === id ? { ...p, accreditation_status: status } : p)));
  }

  const pedidosFiltrados = useMemo(
    () => (filtroStatus === 'todos' ? pedidos : pedidos.filter((p) => p.status === filtroStatus)),
    [pedidos, filtroStatus],
  );

  const rulesetSimulado: Ruleset = useMemo(() => {
    const achado = regras.find((r) => r.region_code === regiao && r.service === servico);
    return achado?.rules ?? RULESET_PADRAO;
  }, [regras, regiao, servico]);

  const dias = useMemo(() => proximosDias(5), []);

  const simulacao = useMemo(() => {
    const dia = dias[quandoIdx];
    const slots = ['07:00', '09:00', '11:00', '14:00', '17:00'];
    return slots.map((h) => {
      try {
        const r = quote(
          {
            service: servico as never,
            minutes: minutos,
            frequency: frequencia,
            scheduledAt: `${dia.iso}T${h}:00-03:00`,
          },
          rulesetSimulado,
        );
        return {
          hora: h,
          preco: r.priceCents,
          repasse: r.payoutCents,
          margem: r.takeRate,
          quebra: r.breakdown,
        };
      } catch (e) {
        return { hora: h, erro: (e as Error).message };
      }
    });
  }, [dias, quandoIdx, servico, minutos, frequencia, rulesetSimulado]);

  const regioes = Array.from(new Set([...regras.map((r) => r.region_code), 'PR-SUL']));

  return (
    <main className="bg-tinta-5 pb-16">
      <div className="container-app py-10">
        <p className="rotulo mb-1 text-tinta-50">Backoffice</p>
        <h1 className="mb-8 text-2xl font-bold tracking-tight">Operação Plano Limpo</h1>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Metrica rotulo="Leads captados" valor={carregando ? '…' : leads ? String(leads.total) : '—'} />
          <Metrica
            rotulo="Leads fora de cobertura"
            valor={carregando ? '…' : leads ? String(leads.sem_cobertura) : '—'}
            nota="cada um é uma cidade pedindo para ser aberta"
          />
          <Metrica rotulo="Regras de preço ativas" valor={carregando ? '…' : String(regras.length)} />
        </div>

        {/* ------------------------------------------------- simulador */}
        <section className="cartao mb-6 p-6">
          <h2 className="text-lg font-bold">Simulador de preço</h2>
          <p className="mb-5 text-sm text-tinta-50">Mesmo motor que roda no funil.</p>

          <div className="mb-5 grid gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="rotulo">Região</span>
              <select className="campo" value={regiao} onChange={(e) => setRegiao(e.target.value)}>
                {regioes.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="rotulo">Serviço</span>
              <select className="campo" value={servico} onChange={(e) => setServico(e.target.value)}>
                {SERVICOS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="rotulo">Duração</span>
              <select className="campo" value={minutos} onChange={(e) => setMinutos(Number(e.target.value))}>
                {[210, 240, 300, 360, 420, 480].map((m) => (
                  <option key={m} value={m}>
                    {horas(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="rotulo">Modalidade</span>
              <select
                className="campo"
                value={frequencia}
                onChange={(e) => setFrequencia(e.target.value as Frequency)}
              >
                <option value="SINGLE">Diária única</option>
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quinzenal</option>
                <option value="MONTHLY">Mensal</option>
              </select>
            </label>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {dias.map((d, i) => (
              <button
                key={d.iso}
                onClick={() => setQuandoIdx(i)}
                className={`rounded-full border-2 px-4 py-1.5 text-xs font-bold transition ${
                  quandoIdx === i ? 'border-tinta-solida bg-tinta-solida text-white' : 'border-tinta-20 text-tinta-50'
                }`}
              >
                {d.hoje ? 'hoje' : `${d.diaSemana} ${d.diaMes}`}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-tinta-20 text-left">
                  <th className="py-2 pr-4 rotulo">Janela</th>
                  <th className="py-2 pr-4 rotulo">Preço</th>
                  <th className="py-2 pr-4 rotulo">Repasse</th>
                  <th className="py-2 pr-4 rotulo">Margem</th>
                  <th className="py-2 rotulo">Composição</th>
                </tr>
              </thead>
              <tbody>
                {simulacao.map((s) => (
                  <tr key={s.hora} className="border-b border-tinta-10 last:border-0">
                    <td className="py-3 pr-4 font-bold numero">{s.hora}</td>
                    {'erro' in s ? (
                      <td colSpan={4} className="py-3 text-xs text-tinta-50">
                        {s.erro}
                      </td>
                    ) : (
                      <>
                        <td className="py-3 pr-4 font-bold text-verde-700 numero">{reais(s.preco!)}</td>
                        <td className="py-3 pr-4 numero">{reais(s.repasse!)}</td>
                        <td className="py-3 pr-4 numero">{Math.round(s.margem! * 100)}%</td>
                        <td className="py-3 text-xs text-tinta-50">
                          {s.quebra!
                            .filter((b) => b.factor && b.factor !== 1)
                            .map((b) => `${b.label} ×${b.factor}`)
                            .join(' · ') || 'sem multiplicadores'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------------------------------------------------- pedidos */}
        <section className="cartao mb-6 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Pedidos</h2>
            <select className="campo w-auto" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="todos">Todos os status</option>
              {Object.entries(STATUS_PEDIDO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>
          {carregando ? (
            <p className="text-sm text-tinta-50">Carregando…</p>
          ) : pedidosFiltrados.length === 0 ? (
            <p className="text-sm text-tinta-50">Nenhum pedido com esse filtro.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tinta-20 text-left">
                    <th className="py-2 pr-4 rotulo">Código</th>
                    <th className="py-2 pr-4 rotulo">Serviço</th>
                    <th className="py-2 pr-4 rotulo">Dia, Horário</th>
                    <th className="py-2 pr-4 rotulo">Status</th>
                    <th className="py-2 rotulo">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map((p) => (
                    <tr key={p.id} className="border-b border-tinta-10 last:border-0">
                      <td className="py-3 pr-4 font-bold numero">{p.code}</td>
                      <td className="py-3 pr-4">{p.service}</td>
                      <td className="py-3 pr-4 numero">
                        {new Date(p.scheduled_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-tinta-5 px-2.5 py-1 text-xs font-bold text-tinta-70">
                          {STATUS_PEDIDO[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-verde-700 numero">{reais(p.price_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* --------------------------------------------- profissionais */}
        <section className="cartao mb-6 p-6">
          <h2 className="mb-4 text-lg font-bold">Profissionais</h2>
          {carregando ? (
            <p className="text-sm text-tinta-50">Carregando…</p>
          ) : profissionais.length === 0 ? (
            <p className="text-sm text-tinta-50">Nenhum profissional cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tinta-20 text-left">
                    <th className="py-2 pr-4 rotulo">Nome</th>
                    <th className="py-2 pr-4 rotulo">CPF</th>
                    <th className="py-2 pr-4 rotulo">Status</th>
                    <th className="py-2 rotulo">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {profissionais.map((p) => (
                    <tr key={p.id} className="border-b border-tinta-10 last:border-0">
                      <td className="py-3 pr-4 font-semibold">{p.full_name}</td>
                      <td className="py-3 pr-4 numero">{p.document}</td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-tinta-5 px-2.5 py-1 text-xs font-bold text-tinta-70">
                          {STATUS_CREDENCIAMENTO[p.accreditation_status]}
                        </span>
                      </td>
                      <td className="flex flex-wrap gap-2 py-3">
                        <button onClick={() => atualizarCredenciamento(p.id, 'approved')} className="btn-verde !px-3 !py-1.5 !text-[11px]">
                          Aprovar
                        </button>
                        <button onClick={() => atualizarCredenciamento(p.id, 'suspended')} className="btn-contorno !px-3 !py-1.5 !text-[11px]">
                          Suspender
                        </button>
                        <button onClick={() => atualizarCredenciamento(p.id, 'blocked')} className="btn-contorno !px-3 !py-1.5 !text-[11px]">
                          Bloquear
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* -------------------------------------------------- cobertura */}
        <section className="cartao p-6">
          <h2 className="mb-4 text-lg font-bold">Cobertura por CEP</h2>
          {carregando ? (
            <p className="text-sm text-tinta-50">Carregando…</p>
          ) : coberturas.length === 0 ? (
            <p className="text-sm text-tinta-50">Nenhuma faixa cadastrada neste ambiente.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tinta-20 text-left">
                    <th className="py-2 pr-4 rotulo">Região</th>
                    <th className="py-2 pr-4 rotulo">Cidade</th>
                    <th className="py-2 pr-4 rotulo">Faixa de CEP</th>
                    <th className="py-2 rotulo">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {coberturas.map((c) => (
                    <tr key={c.id} className="border-b border-tinta-10 last:border-0">
                      <td className="py-3 pr-4 font-semibold">{c.region_code}</td>
                      <td className="py-3 pr-4">{c.city}</td>
                      <td className="py-3 pr-4 numero">
                        {c.zip_start} — {c.zip_end}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            c.active ? 'bg-verde-50 text-verde-700' : 'bg-tinta-10 text-tinta-50'
                          }`}
                        >
                          {c.state} · {c.active ? 'ativa' : 'inativa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metrica({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="cartao p-5">
      <p className="rotulo">{rotulo}</p>
      <p className="text-2xl font-bold numero">{valor}</p>
      {nota && <p className="mt-1 text-xs text-tinta-50">{nota}</p>}
    </div>
  );
}
