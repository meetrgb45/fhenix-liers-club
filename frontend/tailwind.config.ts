import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        saloon: {
          bg:     '#0d0d0d',
          card:   '#1a1a1a',
          border: '#2a2a2a',
          green:  '#2dc653',
          gold:   '#f5c518',
          red:    '#e63946',
        },
      },
    },
  },
  plugins: [],
};

export default config;
