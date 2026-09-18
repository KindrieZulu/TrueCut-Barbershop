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
          400: 'var(--tc-gold-400)',
          500: 'var(--tc-gold-500)',
          600: 'var(--tc-gold-600)',
        },
        dark: {
          900: 'var(--tc-dark-900)',
          800: 'var(--tc-dark-800)',
          700: 'var(--tc-dark-700)',
          600: 'var(--tc-dark-600)',
        },
        gray: {
          100: 'var(--tc-text)',
          300: 'var(--tc-text-soft)',
          400: 'var(--tc-text-muted)',
          500: 'var(--tc-text-muted)',
          600: 'var(--tc-text-faint)',
        }
      },
      fontFamily: {
        display: ['Cabinet Grotesk', 'General Sans', 'sans-serif'],
        sans: ['General Sans', 'system-ui', 'sans-serif'],
        data: ['Geist', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
