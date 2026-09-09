'use client';

import { useEffect, useState } from 'react';
import { SERVICOS as SERVICOS_PADRAO, OPCIONAIS as OPCIONAIS_PADRAO, type Servico, type Opcional } from './catalogo';
import { buscarServicos, buscarOpcionais } from './catalogoDb';

/** Catálogo ao vivo do banco pros componentes de cliente — começa com o
 * piso do código (sem tela vazia enquanto carrega) e troca assim que o
 * Supabase responde. */
export function useCatalogo() {
  const [servicos, setServicos] = useState<Servico[]>(SERVICOS_PADRAO);
  const [opcionais, setOpcionais] = useState<Opcional[]>(OPCIONAIS_PADRAO);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [s, o] = await Promise.all([buscarServicos(), buscarOpcionais()]);
      if (!ativo) return;
      setServicos(s);
      setOpcionais(o);
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return { servicos, opcionais, carregando };
}
