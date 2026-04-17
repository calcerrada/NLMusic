import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/hooks/**/*.{js,ts,jsx,tsx}',
    './src/store/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        cyan: 'var(--cyan)',
        amber: 'var(--amber)',
        violet: 'var(--violet)',
        red: 'var(--red)',
        text: 'var(--text)',
      },
      fontFamily: {
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-dm-sans)', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
