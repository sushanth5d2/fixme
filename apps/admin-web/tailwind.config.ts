import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: '#2563eb', light: '#3b82f6', soft: '#dbeafe' },
        primary: { DEFAULT: '#0f172a', light: '#1e293b' },
      },
    },
  },
  plugins: [],
};
export default config;
