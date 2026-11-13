/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        campo: '#0F3D2E',
        sombra: '#08231A',
        grama: '#1A5A44',
        giz: '#F6F3E7',
        canario: '#FFD23F',
        anil: '#2B5FC2',
        cartao: '#E5484D',
      },
      fontFamily: {
        placa: ['"Bowlby One"', 'Impact', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
