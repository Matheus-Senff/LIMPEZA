'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Marca';
import { supabase } from '@/lib/supabase';
import { buscarPerfil, ROTA_POR_PAPEL } from '@/lib/perfil';
import { lerSenhaPendente, limparSenhaPendente } from '@/lib/senhaPendente';

export default function RedefinirSenha() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [senhaPendente, setSenhaPendente] = useState<string | null>(null);
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      setPronto(Boolean(data.session));
      if (data.session) setSenhaPendente(lerSenhaPendente());
    })();
  }, []);

  async function aplicarSenha(novaSenha: string) {
    if (!supabase) return;
    setCarregando(true);
    setErro(null);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    limparSenhaPendente();
    const perfil = await buscarPerfil();
    router.replace(perfil ? ROTA_POR_PAPEL[perfil.role] : '/cadastrar');
  }

  async function confirmarSenhaPendente() {
    if (senhaPendente) await aplicarSenha(senhaPendente);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setErro('As senhas não coincidem.');
      return;
    }
    await aplicarSenha(senha);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-tinta-5 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="cartao p-7">
          <h1 className="text-xl font-bold tracking-tight">Nova senha</h1>

          {!pronto ? (
            <p className="mt-3 text-sm text-tinta-50">
              Link inválido ou expirado. Peça um novo link em{' '}
              <a href="/recuperar-senha" className="font-semibold text-tinta underline">
                recuperar senha
              </a>
              .
            </p>
          ) : senhaPendente ? (
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-sm text-tinta-50">
                Confirme a troca de senha que você pediu em Minha conta.
              </p>
              {erro && (
                <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">
                  {erro}
                </p>
              )}
              <button onClick={confirmarSenhaPendente} className="btn-primario w-full" disabled={carregando}>
                {carregando ? 'Confirmando…' : 'Confirmar nova senha'}
              </button>
              <button
                type="button"
                onClick={() => setSenhaPendente(null)}
                className="text-center text-sm text-tinta-50"
              >
                Prefiro digitar de novo
              </button>
            </div>
          ) : (
            <form onSubmit={salvar} className="mt-6 flex flex-col gap-3">
              <input
                type="password"
                required
                className="campo"
                placeholder="Senha nova"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                aria-label="Senha nova"
              />
              <input
                type="password"
                required
                className="campo"
                placeholder="Confirmar senha"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                aria-label="Confirmar senha"
              />
              {erro && (
                <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">
                  {erro}
                </p>
              )}
              <button className="btn-primario w-full" disabled={carregando}>
                {carregando ? 'Salvando…' : 'Salvar senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
