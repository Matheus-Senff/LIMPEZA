'use client';

import { useEffect, useState } from 'react';
import { usePerfil } from '@/lib/usePerfil';
import { supabase } from '@/lib/supabase';
import { useCatalogo } from '@/lib/useCatalogo';
import { ContaAcesso } from '@/components/ContaAcesso';
import { PainelSuporte } from '@/components/PainelSuporte';
import { DocumentosCredenciamento } from '@/components/DocumentosCredenciamento';
import { ChatCredenciamento } from '@/components/ChatCredenciamento';

export default function ContaProfissional() {
  const perfil = usePerfil();
  const { servicos: catalogoServicos } = useCatalogo();
  const SERVICOS_PROFISSIONAL = catalogoServicos.filter((s) => s.code !== 'HOME_ASSISTANCE');
  const [nome, setNome] = useState(perfil.full_name);
  const [telefone, setTelefone] = useState(perfil.phone ?? '');
  const [documento, setDocumento] = useState('');
  const [servicos, setServicos] = useState<string[]>([]);
  const [statusCredenciamento, setStatusCredenciamento] = useState<string>('pending');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [chatExpandido, setChatExpandido] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [salvandoPix, setSalvandoPix] = useState(false);
  const [avisoPix, setAvisoPix] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setCarregando(false);
        return;
      }
      const { data } = await supabase
        .from('professionals')
        .select('document, skills, accreditation_status, pix_key')
        .eq('id', perfil.id)
        .maybeSingle();
      setDocumento(data?.document ?? '');
      setServicos(data?.skills ?? []);
      setStatusCredenciamento(data?.accreditation_status ?? 'pending');
      setChatExpandido(data?.accreditation_status !== 'approved');
      setPixKey(data?.pix_key ?? '');
      setCarregando(false);
    })();
  }, [perfil.id]);

  function alternarServico(code: string) {
    setServicos((atual) => (atual.includes(code) ? atual.filter((c) => c !== code) : [...atual, code]));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSalvando(true);
    setAviso(null);
    const [r1, r2] = await Promise.all([
      supabase.rpc('fn_atualizar_meu_perfil', { p_full_name: nome, p_phone: telefone || null }),
      supabase.rpc('fn_atualizar_servicos_profissional', { p_skills: servicos }),
    ]);
    setSalvando(false);
    setAviso(r1.error || r2.error ? 'Não foi possível salvar.' : 'Dados atualizados.');
  }

  async function salvarPix(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSalvandoPix(true);
    setAvisoPix(null);
    const { error } = await supabase.rpc('fn_atualizar_pix_profissional', { p_pix_key: pixKey });
    setSalvandoPix(false);
    setAvisoPix(error ? 'Não foi possível salvar.' : 'Chave Pix atualizada.');
  }

  if (carregando) return <main className="container-app py-10 text-sm text-tinta-50">Carregando…</main>;

  return (
    <main className="container-app flex max-w-2xl flex-col gap-8 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Minha conta</h1>

      <section className="cartao p-6">
        <form onSubmit={salvar} className="flex flex-col gap-3">
          <input className="campo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" aria-label="Nome completo" />
          <input className="campo" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Celular com DDD" aria-label="Celular" />
          <input className="campo bg-tinta-5" value={documento} disabled aria-label="CPF" />
          <p className="-mt-2 text-xs text-tinta-50">CPF não pode ser alterado.</p>

          <fieldset className="rounded-xl border border-tinta-20 p-4">
            <legend className="rotulo px-2">O que você atende</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SERVICOS_PROFISSIONAL.map((s) => (
                <label key={s.code} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#2563eb]"
                    checked={servicos.includes(s.code)}
                    onChange={() => alternarServico(s.code)}
                  />
                  {s.nome}
                </label>
              ))}
            </div>
          </fieldset>

          {aviso && <p className="text-sm font-semibold text-tinta">{aviso}</p>}
          <button className="btn-primario w-fit" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </form>
      </section>

      <section className="cartao p-6">
        <h2 className="mb-1 text-lg font-bold">Onde você recebe</h2>
        <p className="mb-4 text-sm text-tinta-50">Cadastre sua chave Pix</p>
        <form onSubmit={salvarPix} className="flex flex-col gap-3">
          <input
            className="campo"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="CPF, e-mail, celular ou chave aleatória"
            aria-label="Chave Pix"
          />
          {avisoPix && <p className="text-sm font-semibold text-tinta">{avisoPix}</p>}
          <button className="btn-primario w-fit" disabled={salvandoPix}>
            {salvandoPix ? 'Salvando…' : 'Salvar chave Pix'}
          </button>
        </form>
      </section>

      <DocumentosCredenciamento
        professionalId={perfil.id}
        status={statusCredenciamento}
        onEnviado={() => setStatusCredenciamento('in_review')}
      />

      {statusCredenciamento === 'approved' && !chatExpandido ? (
        <section className="cartao flex flex-wrap items-center justify-between gap-3 p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-verde-50 text-verde-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <p className="font-bold">Conversa com a administração</p>
              <p className="text-xs text-tinta-50">Credenciamento aprovado — histórico da conversa fica salvo.</p>
            </div>
          </div>
          <button onClick={() => setChatExpandido(true)} className="btn-contorno !px-3 !py-1.5 !text-[11px]">
            Abrir conversa
          </button>
        </section>
      ) : (
        <section className="cartao p-6">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Fale com a administração</h2>
            {statusCredenciamento === 'approved' && (
              <button onClick={() => setChatExpandido(false)} className="text-xs font-bold text-tinta-50 underline">
                Minimizar
              </button>
            )}
          </div>
          <p className="mb-4 text-sm text-tinta-50">
            Use esse chat para combinar o treinamento de limpeza e tirar dúvidas sobre o credenciamento.
          </p>
          <ChatCredenciamento
            professionalId={perfil.id}
            meuId={perfil.id}
            meuNome={perfil.full_name}
            outroNome="Administração"
          />
        </section>
      )}

      <ContaAcesso email={perfil.email} />

      <PainelSuporte meuId={perfil.id} />
    </main>
  );
}
