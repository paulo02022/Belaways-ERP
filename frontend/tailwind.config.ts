import forms from '@tailwindcss/forms';
import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbf5ff',
          100: '#f4e6ff',
          200: '#e7c8f7',
          300: '#d69ee9',
          400: '#bd67d4',
          500: '#a348be',
          600: '#8e44ad',
          700: '#6f318b',
          800: '#542865',
          900: '#3c1d49',
        },
        ink: '#17151d',
        mint: '#10b981',
        coral: '#f9735b',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(23, 21, 29, 0.08)',
        glow: '0 18px 40px rgba(142, 68, 173, 0.18)',
      },
      fontFamily: {
        sans: ['"Segoe UI Variable"', 'Aptos', '"Segoe UI"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [forms],
} satisfies Config;
