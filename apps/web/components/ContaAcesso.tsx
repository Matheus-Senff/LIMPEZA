'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * E-mail e senha são credenciais de login — mudam só com confirmação por
 * e-mail, nunca de forma instantânea aqui dentro. Senha reaproveita o
 * mesmo link de "esqueci minha senha" já existente, em vez de aceitar uma
 * senha nova direto no formulário.
 */
export function ContaAcesso({ email }: { email: string }) {
  const [editandoEmail, setEditandoEmail] = useState(false);
  const [novoEmail, setNovoEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [avisoEmail, setAvisoEmail] = useState<string | null>(null);

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

  async function pedirTrocaDeSenha() {
    if (!supabase) return;
    setEnviandoSenha(true);
    setAvisoSenha(null);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setEnviandoSenha(false);
    setAvisoSenha(`Enviamos um link para ${email} pra você definir uma senha nova.`);
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-tinta-50">Por segurança, a troca é feita por um link enviado ao seu e-mail.</p>
            <button onClick={pedirTrocaDeSenha} disabled={enviandoSenha} className="text-xs font-semibold text-azul-600">
              {enviandoSenha ? 'Enviando…' : 'Alterar senha'}
            </button>
          </div>
          {avisoSenha && <p className="mt-2 text-xs font-semibold text-tinta">{avisoSenha}</p>}
        </div>
      </div>
    </section>
  );
}
