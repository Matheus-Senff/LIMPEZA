'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { guardarSenhaPendente } from '@/lib/senhaPendente';

/**
 * E-mail e senha são credenciais de login — mudam só com confirmação por
 * e-mail, nunca de forma instantânea aqui dentro.
 *
 * A senha nova é digitada aqui (como o e-mail), mas só é aplicada depois
 * que o usuário clica no link de confirmação enviado — o Supabase não tem
 * um jeito de "trocar senha pendente de confirmação", então a senha fica
 * guardada só no navegador (nunca em servidor nenhum) até a confirmação;
 * se o link for aberto em outro aparelho, a tela de confirmação pede a
 * senha de novo em vez de aplicar às cegas.
 */
export function ContaAcesso({ email }: { email: string }) {
  const [editandoEmail, setEditandoEmail] = useState(false);
  const [novoEmail, setNovoEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [avisoEmail, setAvisoEmail] = useState<string | null>(null);

  const [editandoSenha, setEditandoSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [enviandoSenha, setEnviandoSenha] = useState(false);
  const [avisoSenha, setAvisoSenha] = useState<string | null>(null);

  async function confirmarNovoEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setEnviandoEmail(true);
    setAvisoEmail(null);
    const { error } = await supabase.auth.updateUser({ email: novoEmail });
    setEnviandoEmail(false);
    if (error) {
      setAvisoEmail(error.message);
      return;
    }
    setAvisoEmail(`Enviamos um link de confirmação para ${novoEmail}. O e-mail só muda depois que você clicar nele.`);
    setEditandoEmail(false);
    setNovoEmail('');
  }

  async function confirmarNovaSenha(e: React.FormEvent) {
    e.preventDefault();
    setAvisoSenha(null);
    if (novaSenha.length < 6) {
      setAvisoSenha('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setAvisoSenha('As senhas não coincidem.');
      return;
    }
    if (!supabase) return;
    setEnviandoSenha(true);
    guardarSenhaPendente(novaSenha);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setEnviandoSenha(false);
    setAvisoSenha(`Enviamos um link de confirmação para ${email}. A senha só muda depois que você clicar nele.`);
    setEditandoSenha(false);
    setNovaSenha('');
    setConfirmarSenha('');
  }

  return (
    <section className="cartao p-6">
      <h2 className="mb-4 text-lg font-bold">Acesso</h2>
      <div className="flex flex-col gap-4">
        <div>
          <p className="rotulo mb-1">E-mail</p>
          {!editandoEmail ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">{email}</p>
              <button onClick={() => setEditandoEmail(true)} className="text-xs font-semibold text-azul-600">
                Alterar e-mail
              </button>
            </div>
          ) : (
            <form onSubmit={confirmarNovoEmail} className="flex flex-col gap-2">
              <input
                type="email"
                required
                className="campo"
                placeholder="Novo e-mail"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                aria-label="Novo e-mail"
              />
              <div className="flex gap-2">
                <button className="btn-contorno !px-4 !py-2 !text-xs" disabled={enviandoEmail}>
                  {enviandoEmail ? 'Enviando…' : 'Enviar confirmação'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditandoEmail(false);
                    setNovoEmail('');
                  }}
                  className="text-xs font-semibold text-tinta-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
          {avisoEmail && <p className="mt-2 text-xs font-semibold text-tinta">{avisoEmail}</p>}
        </div>

        <div className="border-t border-tinta-10 pt-4">
          <p className="rotulo mb-1">Senha</p>
          {!editandoSenha ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-tinta-50">Por segurança, a troca só vale depois de confirmada por e-mail.</p>
              <button onClick={() => setEditandoSenha(true)} className="text-xs font-semibold text-azul-600">
                Alterar senha
              </button>
            </div>
          ) : (
            <form onSubmit={confirmarNovaSenha} className="flex flex-col gap-2">
              <input
                type="password"
                required
                className="campo"
                placeholder="Senha nova"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                aria-label="Senha nova"
              />
              <input
                type="password"
                required
                className="campo"
                placeholder="Confirmar senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                aria-label="Confirmar senha nova"
              />
              <div className="flex gap-2">
                <button className="btn-contorno !px-4 !py-2 !text-xs" disabled={enviandoSenha}>
                  {enviandoSenha ? 'Enviando…' : 'Enviar confirmação'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditandoSenha(false);
                    setNovaSenha('');
                    setConfirmarSenha('');
                  }}
                  className="text-xs font-semibold text-tinta-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
          {avisoSenha && <p className="mt-2 text-xs font-semibold text-tinta">{avisoSenha}</p>}
        </div>
      </div>
    </section>
  );
}
