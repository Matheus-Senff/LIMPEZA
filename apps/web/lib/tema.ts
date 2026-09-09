const CHAVE = 'plano-limpo:tema';

export type Tema = 'claro' | 'escuro';

export function lerTemaAtual(): Tema {
  if (typeof document === 'undefined') return 'claro';
  return document.documentElement.getAttribute('data-tema') === 'escuro' ? 'escuro' : 'claro';
}

export function aplicarTema(tema: Tema) {
  if (tema === 'escuro') {
    document.documentElement.setAttribute('data-tema', 'escuro');
  } else {
    document.documentElement.removeAttribute('data-tema');
  }
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
    if (escuro) document.documentElement.setAttribute('data-tema', 'escuro');
  } catch (e) {}
})();
`;
