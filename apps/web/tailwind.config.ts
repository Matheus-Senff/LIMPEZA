import type { Config } from 'tailwindcss';

// Paleta Plano Limpo v2: só 5 cores.
// branco/tinta (preto·cinza) = base e texto · azul = ação · verde = preço e confirmação
// azul + verde formam o degradê usado em acentos (.gradiente)
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        azul: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        verde: {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        // Escala "tinta" (texto/bordas/fundos neutros) lê de variáveis CSS
        // que trocam de valor no modo escuro — assim toda classe existente
        // (text-tinta-70, border-tinta-20, bg-tinta-5...) já funciona nos
        // dois temas sem precisar de variante dark: espalhada pelo app.
        tinta: {
          DEFAULT: 'rgb(var(--tinta) / <alpha-value>)',
          80: 'rgb(var(--tinta-80) / <alpha-value>)',
          70: 'rgb(var(--tinta-70) / <alpha-value>)',
          50: 'rgb(var(--tinta-50) / <alpha-value>)',
          30: 'rgb(var(--tinta-30) / <alpha-value>)',
          20: 'rgb(var(--tinta-20) / <alpha-value>)',
          10: 'rgb(var(--tinta-10) / <alpha-value>)',
          5: 'rgb(var(--tinta-5) / <alpha-value>)',
        },
        // Fundo da página e das superfícies (cards, modais, inputs) — a
        // única diferença entre eles no claro é sutil (ambos quase brancos);
        // no escuro, superficie fica um tom acima do fundo pra criar
        // profundidade sem depender só de sombra.
        fundo: 'rgb(var(--fundo) / <alpha-value>)',
        superficie: 'rgb(var(--superficie) / <alpha-value>)',
        // "Chip sólido" — botão primário, bolha do chat, dia selecionado no
        // calendário etc. Ao contrário da escala tinta acima, esse tom NÃO
        // troca no escuro: continua um preto fixo pareado com texto branco,
        // porque tinta-DEFAULT vira quase-branco no escuro (serve pra texto)
        // e quebraria esses pares "fundo escuro + texto branco".
        'tinta-solida': '#111214',
      },
      fontFamily: {
        sans: ['var(--fonte-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        cartao: '0 1px 2px rgba(17,18,20,.04), 0 12px 32px -20px rgba(17,18,20,.3)',
        flutuante: '0 8px 40px -12px rgba(17,18,20,.22)',
      },
      borderRadius: {
        card: '14px',
      },
      backgroundImage: {
        degrade: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
      },
      keyframes: {
        entrada: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulsar: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '.45' },
        },
        flutuar1: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(30px,40px) scale(1.15)' },
        },
        flutuar2: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(-40px,-20px) scale(1.1)' },
        },
        flutuar3: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(20px,-30px) scale(1.2)' },
        },
      },
      animation: {
        entrada: 'entrada .28s ease-out both',
        pulsar: 'pulsar 1.4s ease-in-out infinite',
        'flutuar-1': 'flutuar1 16s ease-in-out infinite',
        'flutuar-2': 'flutuar2 20s ease-in-out infinite',
        'flutuar-3': 'flutuar3 18s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
