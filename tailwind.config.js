/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        coral: {
          50: '#fff1ed',
          100: '#ffe0d6',
          200: '#ffc7b5',
          600: '#e35f36',
          700: '#bc4929',
        },
        stone: {
          650: '#5f5852',
        },
      },
      spacing: {
        68: '17rem',
      },
    },
  },
  plugins: [],
}
