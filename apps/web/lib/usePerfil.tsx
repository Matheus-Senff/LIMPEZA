'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { buscarPapeis, buscarPerfil, type Perfil, type PapelUsuario } from './perfil';

const PerfilContext = createContext<Perfil | null>(null);

export function GuardaPerfil({ papel, children }: { papel: PapelUsuario; children: ReactNode }) {
  const router = useRouter();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [pronto, setPronto] = useState(false);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      let p: Perfil | null;
      try {
        p = await buscarPerfil();
      } catch {
        // Sem internet ou Supabase fora do ar: mostra saída em vez de deixar
        // a tela branca pra sempre.
        if (ativo) setFalhou(true);
        return;
      }
      if (!ativo) return;
      if (!p) {
        router.replace('/');
        return;
      }

      // Um e-mail pode ter conta de cliente E de profissional ao mesmo
      // tempo — o acesso depende de ter a linha correspondente, não do
      // último papel gravado em profiles.role.
      const permitido =
        papel === 'admin' ? p.role === 'admin' : (await buscarPapeis(p.id))[papel === 'customer' ? 'cliente' : 'profissional'];

      if (!ativo) return;
      if (!permitido) {
        router.replace('/');
        return;
      }
      setPerfil(p);
      setPronto(true);
    })();
    return () => {
      ativo = false;
    };
  }, [router, papel]);

  if (falhou) {
    return (
      <main className="container-app grid min-h-[60vh] place-items-center py-10 text-center">
        <div>
          <p className="font-bold">Não conseguimos carregar sua conta agora.</p>
          <p className="mt-1 text-sm text-tinta-50">Verifique sua conexão e tente de novo.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={() => window.location.reload()} className="btn-primario">
              Tentar de novo
            </button>
            <a href="/" className="btn-contorno">
              Voltar ao login
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (!pronto || !perfil) return null;
  return <PerfilContext.Provider value={perfil}>{children}</PerfilContext.Provider>;
}

export function usePerfil(): Perfil {
  const ctx = useContext(PerfilContext);
  if (!ctx) throw new Error('usePerfil precisa estar dentro de GuardaPerfil');
  return ctx;
}
