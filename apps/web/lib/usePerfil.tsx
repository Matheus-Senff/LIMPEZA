'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { buscarPerfil, type Perfil, type PapelUsuario } from './perfil';

const PerfilContext = createContext<Perfil | null>(null);

export function GuardaPerfil({ papel, children }: { papel: PapelUsuario; children: ReactNode }) {
  const router = useRouter();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const p = await buscarPerfil();
      if (!ativo) return;
      if (!p || p.role !== papel) {
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

  if (!pronto || !perfil) return null;
  return <PerfilContext.Provider value={perfil}>{children}</PerfilContext.Provider>;
}

export function usePerfil(): Perfil {
  const ctx = useContext(PerfilContext);
  if (!ctx) throw new Error('usePerfil precisa estar dentro de GuardaPerfil');
  return ctx;
}
