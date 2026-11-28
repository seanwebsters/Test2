/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        grape: { 50: '#F5F0FF', 100: '#EBE0FF', 200: '#D6C2FF', 300: '#B794FF', 400: '#9A66FF', 500: '#7C3AED', 600: '#6A2BD9', 700: '#5620B5', 800: '#41188A', 900: '#2B0F5E' },
        lime: { 100: '#EEFCD6', 300: '#B7EF5A', 400: '#9BE22F', 500: '#7ED321', 600: '#5FAE0E', 700: '#478A06' },
        sun: { 100: '#FFF6D6', 300: '#FFE066', 400: '#FFD23F', 500: '#FFC21A', 600: '#E0A200' },
        sky: { 100: '#E0F3FF', 300: '#8FD3FF', 400: '#4FB8FF', 500: '#1CA0F2', 600: '#0C82CC' },
        coral: { 100: '#FFE6E1', 300: '#FF9F8E', 400: '#FF7A66', 500: '#FF5A45', 600: '#E0402B' },
        ink: { 300: '#AFA9C4', 400: '#8A84A3', 500: '#6B6585', 700: '#3D3758', 900: '#1E1A33' },
        cloud: '#F4F1FA',
      },
      fontFamily: {
        display: ['"Fredoka Variable"', 'Fredoka', 'system-ui', 'sans-serif'],
        body: ['"Nunito Variable"', 'Nunito', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
};
