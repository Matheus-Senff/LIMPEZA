/**
 * Fundo abstrato e sutil pra tela de login — formas em degradê que
 * flutuam devagar, só decorativo (aria-hidden, sem interação). Respeita
 * prefers-reduced-motion via a regra global em globals.css.
 *
 * Preenche o fundo sozinho (bg-fundo) e fica opaco atrás de tudo por ser
 * o primeiro elemento no DOM — nada de z-index negativo aqui: dentro de
 * <main> (sem contexto de empilhamento próprio) isso acaba pintando a
 * forma atrás do próprio fundo da página em vez de na frente.
 */
export function FundoAnimado() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-fundo" aria-hidden="true">
      <span className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-azul-400/30 blur-3xl animate-flutuar-1" />
      <span className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-verde-400/25 blur-3xl animate-flutuar-2" />
      <span className="absolute bottom-[-6rem] left-1/4 h-64 w-64 rounded-full bg-azul-200/30 blur-3xl animate-flutuar-3" />
    </div>
  );
}
