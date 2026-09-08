'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePerfil } from '@/lib/usePerfil';
import { supabase } from '@/lib/supabase';
import { ContaAcesso } from '@/components/ContaAcesso';

interface Endereco {
  id: string;
  label: string | null;
  street: string;
  number: string;
  complement: string | null;
  city: string;
  state: string;
}

export default function ContaCliente() {
  const perfil = usePerfil();
  const [nome, setNome] = useState(perfil.full_name);
  const [telefone, setTelefone] = useState(perfil.phone ?? '');
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [avisoPerfil, setAvisoPerfil] = useState<string | null>(null);

  const [novoLabel, setNovoLabel] = useState('');
  const [novoCep, setNovoCep] = useState('');
  const [novaRua, setNovaRua] = useState('');
  const [novoNumero, setNovoNumero] = useState('');
  const [novoComplemento, setNovoComplemento] = useState('');
  const [novaCidade, setNovaCidade] = useState('');
  const [novoEstado, setNovoEstado] = useState('');
  const [salvandoEndereco, setSalvandoEndereco] = useState(false);
  const [mostrarFormEndereco, setMostrarFormEndereco] = useState(false);
  const [avisoEndereco, setAvisoEndereco] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const carregarEnderecos = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('addresses')
      .select('id, label, street, number, complement, city, state')
      .eq('customer_id', perfil.id)
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

  async function adicionarEndereco(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSalvandoEndereco(true);
    setAvisoEndereco(null);
    const { error } = await supabase.from('addresses').insert({
      customer_id: perfil.id,
      label: novoLabel || null,
      zipcode: novoCep.replace(/\D/g, ''),
      street: novaRua,
      number: novoNumero,
      complement: novoComplemento || null,
      city: novaCidade,
      state: novoEstado.slice(0, 2),
    });
    setSalvandoEndereco(false);
    if (error) {
      setAvisoEndereco('Não foi possível salvar esse endereço agora.');
      return;
    }
    setNovoLabel('');
    setNovoCep('');
    setNovaRua('');
    setNovoNumero('');
    setNovoComplemento('');
    setNovaCidade('');
    setNovoEstado('');
    setMostrarFormEndereco(false);
    await carregarEnderecos();
  }

  async function removerEndereco(id: string) {
    if (!supabase) return;
    setRemovendo(id);
    setAvisoEndereco(null);
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    setRemovendo(null);
    if (error) {
      // 23503 = violação de chave estrangeira: o endereço já foi usado em
      // algum pedido, e o histórico não pode perder a referência dele.
      setAvisoEndereco(
        error.code === '23503'
          ? 'Esse endereço já foi usado em um pedido e não pode ser removido — mas você pode parar de usá-lo escolhendo outro na próxima contratação.'
          : 'Não foi possível remover esse endereço agora.',
      );
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
                    {e.complement ? ` · ${e.complement}` : ''} — {e.city}/{e.state}
                  </p>
                </div>
                <button
                  onClick={() => removerEndereco(e.id)}
                  disabled={removendo === e.id}
                  className="text-xs font-semibold text-tinta-50 hover:text-tinta"
                >
                  {removendo === e.id ? 'Removendo…' : 'Remover'}
                </button>
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
          <button onClick={() => setMostrarFormEndereco(true)} className="btn-contorno w-fit">
            + Adicionar endereço
          </button>
        ) : (
          <form onSubmit={adicionarEndereco} className="flex flex-col gap-3">
            <input className="campo" placeholder="Apelido (ex: Casa, Trabalho)" value={novoLabel} onChange={(e) => setNovoLabel(e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <input className="campo" placeholder="Rua" required value={novaRua} onChange={(e) => setNovaRua(e.target.value)} />
              <input className="campo" placeholder="Número" required value={novoNumero} onChange={(e) => setNovoNumero(e.target.value)} />
            </div>
            <input className="campo" placeholder="Complemento" value={novoComplemento} onChange={(e) => setNovoComplemento(e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-[1fr_80px_120px]">
              <input className="campo" placeholder="Cidade" required value={novaCidade} onChange={(e) => setNovaCidade(e.target.value)} />
              <input className="campo" placeholder="UF" required maxLength={2} value={novoEstado} onChange={(e) => setNovoEstado(e.target.value.toUpperCase())} />
              <input
                className="campo"
                placeholder="CEP"
                required
                inputMode="numeric"
                value={novoCep}
                onChange={(e) => setNovoCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
              />
            </div>
            <div className="flex gap-2">
              <button className="btn-contorno w-fit" disabled={salvandoEndereco}>
                {salvandoEndereco ? 'Salvando…' : 'Salvar endereço'}
              </button>
              <button type="button" onClick={() => setMostrarFormEndereco(false)} className="text-sm font-semibold text-tinta-50">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
