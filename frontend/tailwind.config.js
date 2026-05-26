/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0D1B2A',
        'navy-light': '#162438',
        'navy-dark': '#080f18',
        gold: '#C9A84C',
        'gold-light': '#e0c06e',
        'gold-dark': '#a8882d',
        cream: '#F5F0E8',
        'cream-dark': '#ede6d8',
        slate: '#4A5568',
        danger: '#C0392B',
        success: '#27AE60',
      },
      fontFamily: {
        amiri: ['Amiri', 'serif'],
        ibm: ['"IBM Plex Sans Arabic"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(13, 27, 42, 0.08)',
        'card-hover': '0 8px 32px rgba(13, 27, 42, 0.14)',
        gold: '0 4px 16px rgba(201, 168, 76, 0.25)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
