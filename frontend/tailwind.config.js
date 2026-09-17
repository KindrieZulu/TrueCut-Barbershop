/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          400: '#f1c40f',
          500: '#d4af37',
          600: '#aa8c2c',
        },
        dark: {
          900: '#0d0f12',
          800: '#15181e',
          700: '#1e222b',
          600: '#2a303c',
        }
      }
    },
  },
  plugins: [],
}
