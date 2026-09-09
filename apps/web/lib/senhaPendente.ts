/**
 * Guarda a senha nova só no navegador (nunca no servidor) enquanto o
 * usuário confirma a troca pelo link enviado por e-mail — assim ele digita
 * a senha uma vez só em "Minha conta" em vez de digitar de novo depois de
 * clicar no link. Expira sozinha e é apagada assim que usada.
 *
 * Só funciona se o link for aberto no mesmo navegador/aparelho; se não
 * encontrar nada (outro aparelho, storage limpo, expirou), a tela de
 * redefinição volta a pedir a senha normalmente.
 */
const CHAVE = 'plano-limpo:senha-pendente';
const TTL_MS = 15 * 60 * 1000;

export function guardarSenhaPendente(senha: string) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ senha, expiraEm: Date.now() + TTL_MS }));
  } catch {
    // localStorage indisponível (modo privado, etc.) — a troca ainda
    // funciona, só pede a senha de novo na tela de confirmação.
  }
}

export function lerSenhaPendente(): string | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const { senha, expiraEm } = JSON.parse(bruto) as { senha: string; expiraEm: number };
    if (!senha || Date.now() > expiraEm) {
      localStorage.removeItem(CHAVE);
      return null;
    }
    return senha;
  } catch {
    return null;
  }
}

export function limparSenhaPendente() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // sem storage, nada pra limpar
  }
}
