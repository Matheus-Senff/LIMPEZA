'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ServicoAdmin {
  code: string;
  name: string;
  tagline: string | null;
  description: string | null;
  min_minutes: number;
  suggested_minutes: number;
  max_minutes: number;
  brings_products: boolean;
  audience: 'HOME' | 'BUSINESS';
  availability: 'TODAY' | 'TOMORROW';
  included: string[];
  not_included: string[];
  active: boolean;
}

interface AddonAdmin {
  code: string;
  name: string;
  extra_minutes: number;
  services: string[];
  active: boolean;
}

const CAMPOS_VAZIOS: Omit<ServicoAdmin, 'code'> = {
  name: '',
  tagline: '',
  description: '',
  min_minutes: 60,
  suggested_minutes: 120,
  max_minutes: 480,
  brings_products: false,
  audience: 'HOME',
  availability: 'TODAY',
  included: [],
  not_included: [],
  active: true,
};

export default function AdminServicos() {
  const [servicos, setServicos] = useState<ServicoAdmin[]>([]);
  const [addons, setAddons] = useState<AddonAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ServicoAdmin, 'code'>>(CAMPOS_VAZIOS);
  const [inclusoTexto, setInclusoTexto] = useState('');
  const [naoInclusoTexto, setNaoInclusoTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function carregar() {
    if (!supabase) {
      setCarregando(false);
      return;
    }
    const [s, a] = await Promise.all([
      supabase.from('services').select('*').order('sort_order'),
      supabase.from('service_addons').select('*').order('sort_order'),
    ]);
    setServicos((s.data as ServicoAdmin[]) ?? []);
    setAddons((a.data as AddonAdmin[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirServico(code: string) {
    const s = servicos.find((x) => x.code === code);
    if (!s) return;
    setSelecionado(code);
    setForm({
      name: s.name,
      tagline: s.tagline ?? '',
      description: s.description ?? '',
      min_minutes: s.min_minutes,
      suggested_minutes: s.suggested_minutes,
      max_minutes: s.max_minutes,
      brings_products: s.brings_products,
      audience: s.audience,
      availability: s.availability,
      included: s.included,
      not_included: s.not_included,
      active: s.active,
    });
    setInclusoTexto(s.included.join('\n'));
    setNaoInclusoTexto(s.not_included.join('\n'));
    setAviso(null);
  }

  async function salvarServico() {
    if (!supabase || !selecionado) return;
    setSalvando(true);
    setAviso(null);
    const { error } = await supabase
      .from('services')
      .update({
        name: form.name,
        tagline: form.tagline || null,
        description: form.description || null,
        min_minutes: form.min_minutes,
        suggested_minutes: form.suggested_minutes,
        max_minutes: form.max_minutes,
        brings_products: form.brings_products,
        audience: form.audience,
        availability: form.availability,
        included: inclusoTexto.split('\n').map((l) => l.trim()).filter(Boolean),
        not_included: naoInclusoTexto.split('\n').map((l) => l.trim()).filter(Boolean),
        active: form.active,
      })
      .eq('code', selecionado);
    setSalvando(false);
    setAviso(error ? 'Não foi possível salvar.' : 'Salvo — já vale para novos pedidos.');
    if (!error) await carregar();
  }

  async function salvarAddon(code: string, campo: Partial<AddonAdmin>) {
    if (!supabase) return;
    await supabase.from('service_addons').update(campo).eq('code', code);
    await carregar();
  }

  function alternarServicoDoAddon(addon: AddonAdmin, servicoCode: string) {
    const atual = addon.services.includes(servicoCode)
      ? addon.services.filter((c) => c !== servicoCode)
      : [...addon.services, servicoCode];
    salvarAddon(addon.code, { services: atual });
  }

  return (
    <main className="bg-tinta-5 pb-16">
      <div className="container-app py-10">
        <p className="rotulo mb-1 text-tinta-50">Administração</p>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Serviços</h1>
        <p className="mb-8 text-sm text-tinta-50">
          Nome, descrição, duração e itens opcionais de cada serviço — o que muda aqui vale na hora para
          quem for pedir um serviço novo.
        </p>

        {carregando ? (
          <p className="text-sm text-tinta-50">Carregando…</p>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              {servicos.map((s) => (
                <button
                  key={s.code}
                  onClick={() => abrirServico(s.code)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    selecionado === s.code ? 'bg-tinta-solida text-white' : 'bg-superficie text-tinta-70 hover:text-tinta'
                  } ${!s.active ? 'opacity-50' : ''}`}
                >
                  {s.name}
                  {!s.active && ' (inativo)'}
                </button>
              ))}
            </div>

            {selecionado && (
              <section className="cartao mb-6 flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">Editando: {form.name}</h2>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#2563eb]"
                      checked={form.active}
                      onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    />
                    Ativo (aparece pro cliente)
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="rotulo">Nome</span>
                    <input
                      className="campo"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="rotulo">Chamada (frase curta)</span>
                    <input
                      className="campo"
                      value={form.tagline ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="rotulo">Descrição</span>
                  <textarea
                    className="campo min-h-[70px]"
                    value={form.description ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="rotulo">Duração mínima (min)</span>
                    <input
                      type="number"
                      className="campo numero"
                      value={form.min_minutes}
                      onChange={(e) => setForm((f) => ({ ...f, min_minutes: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="rotulo">Duração sugerida (min)</span>
                    <input
                      type="number"
                      className="campo numero"
                      value={form.suggested_minutes}
                      onChange={(e) => setForm((f) => ({ ...f, suggested_minutes: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="rotulo">Duração máxima (min)</span>
                    <input
                      type="number"
                      className="campo numero"
                      value={form.max_minutes}
                      onChange={(e) => setForm((f) => ({ ...f, max_minutes: Number(e.target.value) }))}
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="rotulo">Público</span>
                    <select
                      className="campo"
                      value={form.audience}
                      onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as 'HOME' | 'BUSINESS' }))}
                    >
                      <option value="HOME">Lar</option>
                      <option value="BUSINESS">Empresa</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="rotulo">Disponibilidade</span>
                    <select
                      className="campo"
                      value={form.availability}
                      onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value as 'TODAY' | 'TOMORROW' }))}
                    >
                      <option value="TODAY">Pode ser hoje</option>
                      <option value="TOMORROW">Só a partir de amanhã</option>
                    </select>
                  </label>
                  <label className="mt-6 flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#2563eb]"
                      checked={form.brings_products}
                      onChange={(e) => setForm((f) => ({ ...f, brings_products: e.target.checked }))}
                    />
                    Profissional leva os produtos
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="rotulo">O que está incluso (uma linha por item)</span>
                    <textarea
                      className="campo min-h-[110px]"
                      value={inclusoTexto}
                      onChange={(e) => setInclusoTexto(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="rotulo">O que não está incluso (uma linha por item)</span>
                    <textarea
                      className="campo min-h-[110px]"
                      value={naoInclusoTexto}
                      onChange={(e) => setNaoInclusoTexto(e.target.value)}
                    />
                  </label>
                </div>

                {aviso && <p className="text-sm font-semibold text-tinta">{aviso}</p>}
                <button onClick={salvarServico} disabled={salvando} className="btn-primario w-fit">
                  {salvando ? 'Salvando…' : 'Salvar serviço'}
                </button>
              </section>
            )}

            <section className="cartao p-6">
              <h2 className="mb-1 text-lg font-bold">Itens opcionais (adicionais)</h2>
              <p className="mb-4 text-sm text-tinta-50">
                Cada adicional soma minutos ao pedido. Marque em quais serviços ele aparece como opção.
              </p>
              <div className="flex flex-col gap-4">
                {addons.map((a) => (
                  <div key={a.code} className="rounded-xl border border-tinta-10 p-4">
                    <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_140px_100px]">
                      <input
                        className="campo"
                        value={a.name}
                        onChange={(e) =>
                          setAddons((atual) => atual.map((x) => (x.code === a.code ? { ...x, name: e.target.value } : x)))
                        }
                        onBlur={(e) => salvarAddon(a.code, { name: e.target.value })}
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="number"
                          className="campo numero"
                          value={a.extra_minutes}
                          onChange={(e) =>
                            setAddons((atual) =>
                              atual.map((x) => (x.code === a.code ? { ...x, extra_minutes: Number(e.target.value) } : x)),
                            )
                          }
                          onBlur={(e) => salvarAddon(a.code, { extra_minutes: Number(e.target.value) })}
                        />
                        <span className="text-tinta-50">min</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#2563eb]"
                          checked={a.active}
                          onChange={(e) => {
                            setAddons((atual) => atual.map((x) => (x.code === a.code ? { ...x, active: e.target.checked } : x)));
                            salvarAddon(a.code, { active: e.target.checked });
                          }}
                        />
                        Ativo
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {servicos.map((s) => (
                        <button
                          key={s.code}
                          onClick={() => alternarServicoDoAddon(a, s.code)}
                          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                            a.services.includes(s.code) ? 'bg-tinta-solida text-white' : 'bg-tinta-5 text-tinta-50'
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
