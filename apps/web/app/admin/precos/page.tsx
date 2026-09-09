'use client';

import { useEffect, useMemo, useState } from 'react';
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

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function EditorRegras({
  regra,
  onSalvo,
}: {
  regra: RegraAtiva;
  onSalvo: (rules: Ruleset) => void;
}) {
  const [r, setR] = useState<Ruleset>(() => structuredClone(regra.rules));
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    setR(structuredClone(regra.rules));
    setAviso('');
  }, [regra.id]);

  function num(v: string, atual: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : atual;
  }

  async function salvar() {
    if (!supabase) return;
    setSalvando(true);
    setAviso('');
    const { error } = await supabase.from('pricing_rulesets').update({ rules: r }).eq('id', regra.id);
    setSalvando(false);
    if (error) {
      setAviso('Erro ao salvar: ' + error.message);
      return;
    }
    setAviso('Salvo.');
    onSalvo(r);
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-bold">Preço-base por duração</h3>
        <div className="space-y-2">
          {r.hourAnchors.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="number"
                className="campo w-28"
                value={a.minutes}
                onChange={(e) =>
                  setR({
                    ...r,
                    hourAnchors: r.hourAnchors.map((x, j) => (j === i ? { ...x, minutes: num(e.target.value, x.minutes) } : x)),
                  })
                }
              />
              <span className="text-xs text-tinta-50">min →</span>
              <input
                type="number"
                className="campo w-32"
                value={a.cents / 100}
                step="0.01"
                onChange={(e) =>
                  setR({
                    ...r,
                    hourAnchors: r.hourAnchors.map((x, j) =>
                      j === i ? { ...x, cents: Math.round(num(e.target.value, x.cents / 100) * 100) } : x,
                    ),
                  })
                }
              />
              <span className="text-xs text-tinta-50">R$</span>
              <button
                onClick={() => setR({ ...r, hourAnchors: r.hourAnchors.filter((_, j) => j !== i) })}
                className="text-xs font-bold text-tinta-50 underline"
              >
                remover
              </button>
            </div>
          ))}
          <button
            onClick={() => setR({ ...r, hourAnchors: [...r.hourAnchors, { minutes: 240, cents: 15000 }] })}
            className="text-xs font-bold text-azul-600"
          >
            + adicionar ponto
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold">Multiplicador por frequência</h3>
        <div className="grid grid-cols-4 gap-3">
          {(['SINGLE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const).map((f) => (
            <label key={f} className="flex flex-col gap-1">
              <span className="rotulo">{f}</span>
              <input
                type="number"
                step="0.001"
                className="campo"
                value={r.frequencyMultipliers[f]}
                onChange={(e) =>
                  setR({ ...r, frequencyMultipliers: { ...r.frequencyMultipliers, [f]: num(e.target.value, r.frequencyMultipliers[f]) } })
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold">Multiplicador por antecedência</h3>
        <div className="space-y-2">
          {r.leadTimeMultipliers.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                className="campo w-40"
                value={l.label}
                onChange={(e) =>
                  setR({
                    ...r,
                    leadTimeMultipliers: r.leadTimeMultipliers.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                  })
                }
              />
              <input
                type="number"
                className="campo w-24"
                placeholder="máx dias"
                value={l.maxDays ?? ''}
                onChange={(e) =>
                  setR({
                    ...r,
                    leadTimeMultipliers: r.leadTimeMultipliers.map((x, j) =>
                      j === i ? { ...x, maxDays: e.target.value === '' ? null : num(e.target.value, 0) } : x,
                    ),
                  })
                }
              />
              <span className="text-xs text-tinta-50">×</span>
              <input
                type="number"
                step="0.001"
                className="campo w-24"
                value={l.factor}
                onChange={(e) =>
                  setR({
                    ...r,
                    leadTimeMultipliers: r.leadTimeMultipliers.map((x, j) => (j === i ? { ...x, factor: num(e.target.value, x.factor) } : x)),
                  })
                }
              />
              <button
                onClick={() => setR({ ...r, leadTimeMultipliers: r.leadTimeMultipliers.filter((_, j) => j !== i) })}
                className="text-xs font-bold text-tinta-50 underline"
              >
                remover
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setR({ ...r, leadTimeMultipliers: [...r.leadTimeMultipliers, { maxDays: null, factor: 1, label: 'Nova faixa' }] })
            }
            className="text-xs font-bold text-azul-600"
          >
            + adicionar faixa
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold">Multiplicador por horário</h3>
        <div className="space-y-2">
          {r.windowMultipliers.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                className="campo w-32"
                value={w.label}
                onChange={(e) =>
                  setR({ ...r, windowMultipliers: r.windowMultipliers.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })
                }
              />
              <input
                type="time"
                className="campo w-28"
                value={w.from}
                onChange={(e) =>
                  setR({ ...r, windowMultipliers: r.windowMultipliers.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)) })
                }
              />
              <span className="text-xs text-tinta-50">até</span>
              <input
                type="time"
                className="campo w-28"
                value={w.to}
                onChange={(e) =>
                  setR({ ...r, windowMultipliers: r.windowMultipliers.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)) })
                }
              />
              <span className="text-xs text-tinta-50">×</span>
              <input
                type="number"
                step="0.001"
                className="campo w-24"
                value={w.factor}
                onChange={(e) =>
                  setR({ ...r, windowMultipliers: r.windowMultipliers.map((x, j) => (j === i ? { ...x, factor: num(e.target.value, x.factor) } : x)) })
                }
              />
              <button
                onClick={() => setR({ ...r, windowMultipliers: r.windowMultipliers.filter((_, j) => j !== i) })}
                className="text-xs font-bold text-tinta-50 underline"
              >
                remover
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setR({ ...r, windowMultipliers: [...r.windowMultipliers, { from: '07:00', to: '21:00', factor: 1, label: 'Nova janela' }] })
            }
            className="text-xs font-bold text-azul-600"
          >
            + adicionar janela
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold">Multiplicador por dia da semana</h3>
        <div className="grid grid-cols-7 gap-2">
          {DIAS_SEMANA.map((nome, i) => (
            <label key={i} className="flex flex-col gap-1">
              <span className="rotulo">{nome}</span>
              <input
                type="number"
                step="0.001"
                className="campo"
                value={r.weekdayMultipliers[String(i)]}
                onChange={(e) =>
                  setR({ ...r, weekdayMultipliers: { ...r.weekdayMultipliers, [String(i)]: num(e.target.value, r.weekdayMultipliers[String(i)]) } })
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold">Repasse ao profissional</h3>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="rotulo">Por hora (R$)</span>
            <input
              type="number"
              step="0.01"
              className="campo"
              value={r.payout.hourCents / 100}
              onChange={(e) => setR({ ...r, payout: { ...r.payout, hourCents: Math.round(num(e.target.value, r.payout.hourCents / 100) * 100) } })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="rotulo">Mínimo (R$)</span>
            <input
              type="number"
              step="0.01"
              className="campo"
              value={r.payout.minCents / 100}
              onChange={(e) => setR({ ...r, payout: { ...r.payout, minCents: Math.round(num(e.target.value, r.payout.minCents / 100) * 100) } })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="rotulo">Multiplicador</span>
            <input
              type="number"
              step="0.001"
              className="campo"
              value={r.payout.multiplier}
              onChange={(e) => setR({ ...r, payout: { ...r.payout, multiplier: num(e.target.value, r.payout.multiplier) } })}
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold">Bônus de fidelidade (R$)</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="rotulo">Profissional preferencial</span>
            <input
              type="number"
              step="0.01"
              className="campo"
              value={r.loyaltyBonusCents.preferred / 100}
              onChange={(e) =>
                setR({ ...r, loyaltyBonusCents: { ...r.loyaltyBonusCents, preferred: Math.round(num(e.target.value, r.loyaltyBonusCents.preferred / 100) * 100) } })
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="rotulo">Assinatura recorrente</span>
            <input
              type="number"
              step="0.01"
              className="campo"
              value={r.loyaltyBonusCents.recurring / 100}
              onChange={(e) =>
                setR({ ...r, loyaltyBonusCents: { ...r.loyaltyBonusCents, recurring: Math.round(num(e.target.value, r.loyaltyBonusCents.recurring / 100) * 100) } })
              }
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold">Outros</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="rotulo">Taxa de conexão (R$)</span>
            <input
              type="number"
              step="0.01"
              className="campo"
              value={r.connectFeeCents / 100}
              onChange={(e) => setR({ ...r, connectFeeCents: Math.round(num(e.target.value, r.connectFeeCents / 100) * 100) })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="rotulo">Ajuste por quarto extra</span>
            <input
              type="number"
              step="0.001"
              className="campo"
              value={r.roomAdjustment.bedroomOverBaseline}
              onChange={(e) => setR({ ...r, roomAdjustment: { ...r.roomAdjustment, bedroomOverBaseline: num(e.target.value, r.roomAdjustment.bedroomOverBaseline) } })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="rotulo">Arredondar para (centavos)</span>
            <input
              type="number"
              className="campo"
              value={r.rounding.toCents}
              onChange={(e) => setR({ ...r, rounding: { ...r.rounding, toCents: num(e.target.value, r.rounding.toCents) } })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="rotulo">Duração mínima (min)</span>
            <input
              type="number"
              className="campo"
              value={r.limits.minMinutes}
              onChange={(e) => setR({ ...r, limits: { ...r.limits, minMinutes: num(e.target.value, r.limits.minMinutes) } })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="rotulo">Duração máxima (min)</span>
            <input
              type="number"
              className="campo"
              value={r.limits.maxMinutes}
              onChange={(e) => setR({ ...r, limits: { ...r.limits, maxMinutes: num(e.target.value, r.limits.maxMinutes) } })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="rotulo">Antecedência mínima (min)</span>
            <input
              type="number"
              className="campo"
              value={r.limits.minLeadMinutes}
              onChange={(e) => setR({ ...r, limits: { ...r.limits, minLeadMinutes: num(e.target.value, r.limits.minLeadMinutes) } })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="rotulo">Atende a partir de</span>
            <input
              type="time"
              className="campo"
              value={r.servicesFrom}
              onChange={(e) => setR({ ...r, servicesFrom: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="rotulo">Atende até</span>
            <input
              type="time"
              className="campo"
              value={r.servicesUntil}
              onChange={(e) => setR({ ...r, servicesUntil: e.target.value })}
            />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-4">
          <span className="rotulo">Formas de pagamento aceitas</span>
          {(['pix', 'credit_card'] as const).map((t) => (
            <label key={t} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={r.allowedPaymentTypes.includes(t)}
                onChange={(e) =>
                  setR({
                    ...r,
                    allowedPaymentTypes: e.target.checked
                      ? [...r.allowedPaymentTypes, t]
                      : r.allowedPaymentTypes.filter((x) => x !== t),
                  })
                }
              />
              {t === 'pix' ? 'Pix' : 'Cartão de crédito'}
            </label>
          ))}
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={salvar} disabled={salvando} className="btn-primario w-fit">
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
        {aviso ? <span className="text-sm text-tinta-50">{aviso}</span> : null}
      </div>
    </div>
  );
}

export default function AdminPrecos() {
  const [coberturas, setCoberturas] = useState<Cobertura[]>([]);
  const [regras, setRegras] = useState<RegraAtiva[]>([]);
  const [leads, setLeads] = useState<{ total: number; sem_cobertura: number } | null>(null);
  const [carregando, setCarregando] = useState(true);

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
      const [c, r, l] = await Promise.all([
        supabase.from('coverage_areas').select('*').order('region_code'),
        supabase.from('pricing_rulesets').select('id, region_code, service, version, rules').eq('active', true),
        supabase.from('leads').select('covered'),
      ]);
      setCoberturas(c.data ?? []);
      setRegras((r.data as RegraAtiva[]) ?? []);
      if (l.data) {
        setLeads({
          total: l.data.length,
          sem_cobertura: l.data.filter((x: { covered: boolean }) => !x.covered).length,
        });
      }
      setCarregando(false);
    })();
  }, []);

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
          { service: servico as never, minutes: minutos, frequency: frequencia, scheduledAt: `${dia.iso}T${h}:00-03:00` },
          rulesetSimulado,
        );
        return { hora: h, preco: r.priceCents, repasse: r.payoutCents, margem: r.takeRate, quebra: r.breakdown };
      } catch (e) {
        return { hora: h, erro: (e as Error).message };
      }
    });
  }, [dias, quandoIdx, servico, minutos, frequencia, rulesetSimulado]);

  const regioes = Array.from(new Set([...regras.map((r) => r.region_code), 'PR-SUL']));

  const regraSelecionada = regras.find((r) => r.region_code === regiao && r.service === servico);

  return (
    <main className="bg-tinta-5 pb-16">
      <div className="container-app py-10">
        <p className="rotulo mb-1 text-tinta-50">Administração</p>
        <h1 className="mb-8 text-2xl font-bold tracking-tight">Preços e cobertura</h1>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="cartao p-5">
            <p className="rotulo">Leads captados</p>
            <p className="text-2xl font-bold numero">{carregando ? '…' : leads ? String(leads.total) : '—'}</p>
          </div>
          <div className="cartao p-5">
            <p className="rotulo">Leads fora de cobertura</p>
            <p className="text-2xl font-bold numero">{carregando ? '…' : leads ? String(leads.sem_cobertura) : '—'}</p>
            <p className="mt-1 text-xs text-tinta-50">cada um é uma cidade pedindo para ser aberta</p>
          </div>
          <div className="cartao p-5">
            <p className="rotulo">Regras de preço ativas</p>
            <p className="text-2xl font-bold numero">{carregando ? '…' : String(regras.length)}</p>
          </div>
        </div>

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
              <select className="campo" value={frequencia} onChange={(e) => setFrequencia(e.target.value as Frequency)}>
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
                          {s.quebra!.filter((b) => b.factor && b.factor !== 1).map((b) => `${b.label} ×${b.factor}`).join(' · ') ||
                            'sem multiplicadores'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cartao mb-6 p-6">
          <h2 className="text-lg font-bold">Editar preços</h2>
          <p className="mb-5 text-sm text-tinta-50">
            Use a região e o serviço escolhidos no simulador acima. Alterações valem para pedidos novos a partir do salvamento.
          </p>
          {!regraSelecionada ? (
            <p className="text-sm text-tinta-50">Nenhuma regra cadastrada para {servico} em {regiao}.</p>
          ) : (
            <EditorRegras
              key={regraSelecionada.id}
              regra={regraSelecionada}
              onSalvo={(rules) =>
                setRegras((antigas) => antigas.map((r) => (r.id === regraSelecionada.id ? { ...r, rules } : r)))
              }
            />
          )}
        </section>

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
