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
        tinta: {
          DEFAULT: '#111214',
          80: '#26282c',
          70: '#3f4247',
          50: '#6b7078',
          30: '#a1a6ad',
          20: '#d8dbe0',
          10: '#eceef1',
          5: '#f6f7f9',
        },
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
