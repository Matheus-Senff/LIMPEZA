'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const BUCKET = 'documentos-profissionais';

const CAMPOS = [
  { chave: 'rg_frente', rotulo: 'RG ou CNH — frente' },
  { chave: 'rg_verso', rotulo: 'RG ou CNH — verso' },
  { chave: 'comprovante_endereco', rotulo: 'Comprovante de endereço' },
  { chave: 'selfie', rotulo: 'Selfie segurando o documento' },
] as const;

type Chave = (typeof CAMPOS)[number]['chave'];

export function DocumentosCredenciamento({
  professionalId,
  status,
  onEnviado,
}: {
  professionalId: string;
  status: string;
  onEnviado: () => void;
}) {
  const [arquivos, setArquivos] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<Chave | null>(null);
  const [aviso, setAviso] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    if (!supabase) {
      setCarregando(false);
      return;
    }
    const { data } = await supabase.storage.from(BUCKET).list(professionalId);
    const nomes: Record<string, string> = {};
    (data ?? []).forEach((f) => {
      const chave = f.name.split('.')[0];
      nomes[chave] = f.name;
    });
    setArquivos(nomes);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, [professionalId]);

  async function enviarArquivo(chave: Chave, arquivo: File) {
    if (!supabase) return;
    setEnviando(chave);
    setAviso('');
    const extensao = arquivo.name.split('.').pop() || 'jpg';
    const caminho = `${professionalId}/${chave}.${extensao}`;
    const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, { upsert: true });
    setEnviando(null);
    if (error) {
      setAviso('Erro ao enviar: ' + error.message);
      return;
    }
    await carregar();
  }

  async function confirmarEnvio() {
    if (!supabase) return;
    setConfirmando(true);
    const { error } = await supabase.rpc('fn_marcar_documentos_enviados');
    setConfirmando(false);
    if (error) {
      setAviso('Erro ao confirmar: ' + error.message);
      return;
    }
    onEnviado();
  }

  const todosEnviados = CAMPOS.every((c) => arquivos[c.chave]);

  if (carregando) return null;

  return (
    <section className="cartao p-6">
      <h2 className="mb-1 text-lg font-bold">Documentos para credenciamento</h2>
      <p className="mb-5 text-sm text-tinta-50">
        {status === 'approved'
          ? 'Seu credenciamento já foi aprovado.'
          : status === 'in_review'
            ? 'Documentos enviados, aguardando análise da administração.'
            : status === 'suspended' || status === 'blocked'
              ? 'Seu credenciamento não está ativo. Fale com o suporte se precisar reenviar algo.'
              : 'Envie os 4 documentos abaixo para começar a receber ofertas de serviço.'}
      </p>

      <div className="flex flex-col gap-3">
        {CAMPOS.map((c) => (
          <div key={c.chave} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tinta-20 p-4">
            <div>
              <p className="text-sm font-semibold">{c.rotulo}</p>
              <p className="text-xs text-tinta-50">{arquivos[c.chave] ? 'Enviado' : 'Pendente'}</p>
            </div>
            <label className="btn-contorno cursor-pointer !px-3 !py-1.5 !text-[11px]">
              {enviando === c.chave ? 'Enviando…' : arquivos[c.chave] ? 'Substituir' : 'Enviar'}
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                disabled={enviando !== null || status === 'in_review' || status === 'approved'}
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) enviarArquivo(c.chave, arquivo);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        ))}
      </div>

      {aviso && <p className="mt-3 text-sm font-semibold text-tinta">{aviso}</p>}

      {status === 'pending' && (
        <button onClick={confirmarEnvio} disabled={!todosEnviados || confirmando} className="btn-primario mt-4 w-fit">
          {confirmando ? 'Enviando…' : 'Enviar para análise'}
        </button>
      )}
    </section>
  );
}
