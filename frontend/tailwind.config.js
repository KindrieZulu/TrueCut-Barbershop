/** @type {import('tailwindcss').Config} */

// Colors backed by --tc-* CSS variables (set at runtime by ThemeContext,
// see src/context/ThemeContext.tsx) need this helper rather than a plain
// 'var(--tc-x)' string - Tailwind's opacity-modifier syntax (bg-gold-500/10)
// only works when it can interpolate an alpha value into rgb(), which
// requires the variable to hold a bare "R G B" triplet.
function withOpacity(varName) {
  return ({ opacityValue }) => {
    if (opacityValue === undefined) {
      return `rgb(var(${varName}))`;
    }
    return `rgb(var(${varName}) / ${opacityValue})`;
  };
}

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          400: withOpacity('--tc-gold-400'),
          500: withOpacity('--tc-gold-500'),
          600: withOpacity('--tc-gold-600'),
        },
        dark: {
          900: withOpacity('--tc-dark-900'),
          800: withOpacity('--tc-dark-800'),
          700: withOpacity('--tc-dark-700'),
          600: withOpacity('--tc-dark-600'),
        },
        gray: {
          100: withOpacity('--tc-text'),
          300: withOpacity('--tc-text-soft'),
          400: withOpacity('--tc-text-muted'),
          500: withOpacity('--tc-text-muted'),
          600: withOpacity('--tc-text-faint'),
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
