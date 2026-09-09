const CHAVE = 'plano-limpo:tema';

export type Tema = 'claro' | 'escuro';

export function lerTemaAtual(): Tema {
  if (typeof document === 'undefined') return 'claro';
  return document.documentElement.classList.contains('dark') ? 'escuro' : 'claro';
}

export function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle('dark', tema === 'escuro');
  try {
    localStorage.setItem(CHAVE, tema);
  } catch {
    // sem storage, o tema só não persiste entre sessões
  }
}

/**
 * Roda antes da hidratação (ver layout.tsx) pra decidir o tema sem
 * flash: usa a preferência salva ou, na primeira visita, a do sistema.
 */
export const scriptSemFlash = `
(function () {
  try {
    var salvo = localStorage.getItem('${CHAVE}');
    var escuro = salvo ? salvo === 'escuro' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (escuro) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;
