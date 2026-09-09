'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePerfil } from '@/lib/usePerfil';
import { supabase } from '@/lib/supabase';
import { ContaAcesso } from '@/components/ContaAcesso';
import { Modal } from '@/components/Modal';
import { enderecoDoCep } from '@/lib/viacep';

interface Endereco {
  id: string;
  label: string | null;
  zipcode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string | null;
  city: string;
  state: string;
}

const FORM_VAZIO = {
  label: '',
  cep: '',
  rua: '',
  numero: '',
  semNumero: false,
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
};

export default function ContaCliente() {
  const perfil = usePerfil();
  const [nome, setNome] = useState(perfil.full_name);
  const [telefone, setTelefone] = useState(perfil.phone ?? '');
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [avisoPerfil, setAvisoPerfil] = useState<string | null>(null);

  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [salvandoEndereco, setSalvandoEndereco] = useState(false);
  const [mostrarFormEndereco, setMostrarFormEndereco] = useState(false);
  const [avisoEndereco, setAvisoEndereco] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [enderecoParaRemover, setEnderecoParaRemover] = useState<Endereco | null>(null);

  const carregarEnderecos = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('addresses')
      .select('id, label, zipcode, street, number, complement, district, city, state')
      .eq('customer_id', perfil.id)
      .eq('active', true)
      .order('created_at', { ascending: false });
    setEnderecos(data ?? []);
  }, [perfil.id]);

  useEffect(() => {
    carregarEnderecos();
  }, [carregarEnderecos]);

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSalvandoPerfil(true);
    setAvisoPerfil(null);
    const { error } = await supabase.from('profiles').update({ full_name: nome, phone: telefone || null }).eq('id', perfil.id);
    setSalvandoPerfil(false);
    setAvisoPerfil(error ? 'Não foi possível salvar.' : 'Dados atualizados.');
  }

  function alterarForm(campo: keyof typeof FORM_VAZIO, valor: string | boolean) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  // Preenche rua/bairro/cidade/UF pelo CEP (ViaCEP). Tudo continua editável
  // à mão — o CEP só evita digitação e erro de bairro.
  async function preencherPeloCep(cep: string) {
    if (cep.replace(/\D/g, '').length !== 8) return;
    setBuscandoCep(true);
    const achado = await enderecoDoCep(cep);
    setBuscandoCep(false);
    if (!achado) return;
    setForm((atual) => ({
      ...atual,
      rua: achado.street || atual.rua,
      bairro: achado.district || atual.bairro,
      cidade: achado.city || atual.cidade,
      estado: achado.state || atual.estado,
    }));
  }

  function abrirNovoEndereco() {
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setAvisoEndereco(null);
    setMostrarFormEndereco(true);
  }

  function abrirEdicao(e: Endereco) {
    setForm({
      label: e.label ?? '',
      cep: e.zipcode ?? '',
      rua: e.street,
      numero: e.number === 'S/N' ? '' : e.number,
      semNumero: e.number === 'S/N',
      complemento: e.complement ?? '',
      bairro: e.district ?? '',
      cidade: e.city,
      estado: e.state,
    });
    setEditandoId(e.id);
    setAvisoEndereco(null);
    setMostrarFormEndereco(true);
  }

  async function salvarEndereco(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSalvandoEndereco(true);
    setAvisoEndereco(null);
    const dados = {
      label: form.label || null,
      zipcode: form.cep.replace(/\D/g, ''),
      street: form.rua,
      number: form.semNumero ? 'S/N' : form.numero,
      complement: form.complemento || null,
      district: form.bairro,
      city: form.cidade,
      state: form.estado.slice(0, 2),
    };
    // A RPC edita a linha no lugar quando ela ainda não foi usada em pedido
    // nenhum; se já foi, grava uma versão nova e aposenta a antiga, pra não
    // reescrever o endereço que aparece num pedido já feito.
    const { data, error } = await supabase.rpc('fn_salvar_endereco', {
      p_id: editandoId,
      p_label: dados.label,
      p_zipcode: dados.zipcode,
      p_street: dados.street,
      p_number: dados.number,
      p_complement: dados.complement,
      p_district: dados.district,
      p_city: dados.city,
      p_state: dados.state,
    });
    setSalvandoEndereco(false);
    if (error || !data) {
      setAvisoEndereco('Não foi possível salvar esse endereço agora.');
      return;
    }
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setMostrarFormEndereco(false);
    await carregarEnderecos();
  }

  async function removerEndereco(id: string) {
    if (!supabase) return;
    setRemovendo(id);
    setAvisoEndereco(null);
    // Soft delete: pedidos antigos continuam com o endereço completo pro
    // histórico, mesmo depois que o usuário "remove" ele daqui.
    const { data, error } = await supabase.rpc('fn_remover_endereco', { p_id: id });
    setRemovendo(null);
    setEnderecoParaRemover(null);
    if (error || !data) {
      setAvisoEndereco('Não foi possível remover esse endereço agora.');
      return;
    }
    await carregarEnderecos();
  }

  return (
    <main className="container-app flex max-w-2xl flex-col gap-8 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Minha conta</h1>

      <section className="cartao p-6">
        <h2 className="mb-4 text-lg font-bold">Seus dados</h2>
        <form onSubmit={salvarPerfil} className="flex flex-col gap-3">
          <input className="campo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" aria-label="Nome completo" />
          <input className="campo" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Celular com DDD" aria-label="Celular" />
          {avisoPerfil && <p className="text-sm font-semibold text-tinta">{avisoPerfil}</p>}
          <button className="btn-primario w-fit" disabled={salvandoPerfil}>
            {salvandoPerfil ? 'Salvando…' : 'Salvar'}
          </button>
        </form>
      </section>

      <ContaAcesso email={perfil.email} />

      <section className="cartao p-6">
        <h2 className="mb-4 text-lg font-bold">Endereços salvos</h2>
        {enderecos.length === 0 ? (
          <p className="mb-4 text-sm text-tinta-50">Nenhum endereço salvo ainda.</p>
        ) : (
          <ul className="mb-4 flex flex-col divide-y divide-tinta-10">
            {enderecos.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                <div className="text-sm">
                  <p className="font-semibold">{e.label ?? `${e.street}, ${e.number}`}</p>
                  <p className="text-tinta-50">
                    {e.street}, {e.number}
                    {e.complement ? ` · ${e.complement}` : ''}
                    {e.district ? ` — ${e.district}` : ''} — {e.city}/{e.state}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button onClick={() => abrirEdicao(e)} className="text-xs font-semibold text-azul-600">
                    Editar
                  </button>
                  <button
                    onClick={() => setEnderecoParaRemover(e)}
                    disabled={removendo === e.id}
                    className="text-xs font-semibold text-tinta-50 hover:text-tinta"
                  >
                    {removendo === e.id ? 'Removendo…' : 'Remover'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {avisoEndereco && (
          <p className="mb-4 rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">
            {avisoEndereco}
          </p>
        )}

        {!mostrarFormEndereco ? (
          <button onClick={abrirNovoEndereco} className="btn-contorno w-fit">
            + Adicionar endereço
          </button>
        ) : (
          <form onSubmit={salvarEndereco} className="flex flex-col gap-3">
            <input
              className="campo"
              placeholder="Apelido (ex: Casa, Trabalho)"
              value={form.label}
              onChange={(e) => alterarForm('label', e.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <input
                className="campo"
                placeholder="CEP"
                required
                inputMode="numeric"
                value={form.cep}
                onChange={(e) => alterarForm('cep', e.target.value.replace(/\D/g, '').slice(0, 8))}
                onBlur={(e) => preencherPeloCep(e.target.value)}
                aria-label="CEP"
              />
              <input
                className="campo"
                placeholder="Rua"
                required
                value={form.rua}
                onChange={(e) => alterarForm('rua', e.target.value)}
                aria-label="Rua"
              />
            </div>
            {buscandoCep && <p className="text-xs text-tinta-50">Buscando endereço pelo CEP…</p>}
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <input
                className="campo"
                placeholder="Número"
                required={!form.semNumero}
                disabled={form.semNumero}
                value={form.semNumero ? 'S/N' : form.numero}
                onChange={(e) => alterarForm('numero', e.target.value)}
                aria-label="Número"
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-tinta-70">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#2563eb]"
                  checked={form.semNumero}
                  onChange={(e) => alterarForm('semNumero', e.target.checked)}
                />
                Sem número (S/N)
              </label>
            </div>
            <input
              className="campo"
              placeholder="Bairro"
              required
              value={form.bairro}
              onChange={(e) => alterarForm('bairro', e.target.value)}
              aria-label="Bairro"
            />
            <input
              className="campo"
              placeholder="Complemento"
              value={form.complemento}
              onChange={(e) => alterarForm('complemento', e.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-[1fr_80px]">
              <input
                className="campo"
                placeholder="Cidade"
                required
                value={form.cidade}
                onChange={(e) => alterarForm('cidade', e.target.value)}
                aria-label="Cidade"
              />
              <input
                className="campo"
                placeholder="UF"
                required
                maxLength={2}
                value={form.estado}
                onChange={(e) => alterarForm('estado', e.target.value.toUpperCase())}
                aria-label="UF"
              />
            </div>
            <div className="flex gap-2">
              <button className="btn-contorno w-fit" disabled={salvandoEndereco}>
                {salvandoEndereco ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Salvar endereço'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarFormEndereco(false);
                  setEditandoId(null);
                }}
                className="text-sm font-semibold text-tinta-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>

      {enderecoParaRemover && (
        <Modal titulo="Remover endereço" onFechar={() => setEnderecoParaRemover(null)}>
          <p className="text-sm text-tinta-70">
            Tem certeza que quer remover{' '}
            <b className="text-tinta">
              {enderecoParaRemover.label ?? `${enderecoParaRemover.street}, ${enderecoParaRemover.number}`}
            </b>
            ?
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => removerEndereco(enderecoParaRemover.id)}
              disabled={removendo === enderecoParaRemover.id}
              className="btn-contorno"
            >
              {removendo === enderecoParaRemover.id ? 'Removendo…' : 'Remover'}
            </button>
            <button type="button" onClick={() => setEnderecoParaRemover(null)} className="text-sm font-semibold text-tinta-50">
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
