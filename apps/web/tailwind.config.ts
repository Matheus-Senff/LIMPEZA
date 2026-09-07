import type { Config } from 'tailwindcss';

// Paleta Plano Limpo: as cores carregam significado, não decoração.
// azul = marca e ação · verde = preço e confirmação · vermelho = urgência
// amarelo = destaque e promoção · preto/branco = base
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        azul: {
          50: '#eef3ff',
          100: '#dbe6ff',
          200: '#bdd0ff',
          500: '#2f6bea',
          600: '#1546c8',
          700: '#0f37a3',
          900: '#0a2062',
        },
        verde: {
          50: '#e9f8f0',
          100: '#c9efdd',
          500: '#12a660',
          600: '#0e8a4f',
          700: '#0a6b3e',
        },
        vermelho: {
          50: '#fdecec',
          100: '#fbd5d5',
          500: '#e13b3b',
          600: '#d62b2b',
          700: '#ad2020',
        },
        amarelo: {
          50: '#fff8e1',
          100: '#ffefb8',
          400: '#f5c518',
          500: '#e0ae00',
          700: '#8a6a00',
        },
        tinta: {
          DEFAULT: '#101114',
          70: '#3c4149',
          50: '#667085',
          20: '#e4e7ec',
          10: '#f1f3f6',
          5: '#f8f9fb',
        },
      },
      fontFamily: {
        sans: ['var(--fonte-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        cartao: '0 1px 2px rgba(16,17,20,.05), 0 12px 32px -20px rgba(16,17,20,.35)',
        flutuante: '0 8px 40px -12px rgba(16,17,20,.25)',
      },
      borderRadius: {
        card: '14px',
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
      },
      animation: {
        entrada: 'entrada .28s ease-out both',
        pulsar: 'pulsar 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
