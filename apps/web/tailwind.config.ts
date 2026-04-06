import type { Config } from 'tailwindcss';

// AVRA Design System — Vert profond, Ivoire, Cuivre
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        avra: {
          primary: '#304035',    // vert profond
          'primary-light': '#3d5244',
          'primary-dark': '#202b24',
          surface: '#f5eee8',   // ivoire / sable
          'surface-dark': '#ede5d8',
          accent: '#a67749',    // cuivre
          'accent-light': '#b88a5c',
          'accent-dark': '#8c623c',
          success: '#2d5a3d',
          warning: '#b8860b',
          error: '#a63d3d',
          info: '#3d5a6a',
          muted: '#8a9490',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-playfair-display)', 'Georgia', 'serif'],
        display: ['var(--font-dm-sans)', 'sans-serif'],
      },
      borderRadius: {
        avra: '0.75rem',
        'avra-lg': '1rem',
        'avra-xl': '1.5rem',
      },
      boxShadow: {
        avra: '0 4px 14px rgba(48, 64, 53, 0.08)',
        'avra-lg': '0 8px 24px rgba(48, 64, 53, 0.12)',
        'avra-glow': '0 0 20px rgba(166, 119, 73, 0.25)',
        'avra-card': '0 2px 8px rgba(48, 64, 53, 0.06), 0 1px 2px rgba(48, 64, 53, 0.04)',
      },
      backgroundImage: {
        'avra-gradient': 'linear-gradient(135deg, #304035 0%, #2a3830 100%)',
        'avra-surface-gradient': 'linear-gradient(135deg, #f5eee8 0%, #ede5d8 100%)',
        'avra-accent-gradient': 'linear-gradient(135deg, #a67749 0%, #8c623c 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
