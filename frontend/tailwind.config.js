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
        },
        // Semantic status colors - only 400/500/600 are theme-aware (the
        // shades this app actually uses for status text/badges/buttons).
        // Other shades (300, 700+) fall through to Tailwind's defaults,
        // matching the same incremental, screen-by-screen rollout approach
        // used for the rest of the design system.
        green: {
          400: withOpacity('--tc-green-400'),
          500: withOpacity('--tc-green-500'),
          600: withOpacity('--tc-green-600'),
        },
        red: {
          400: withOpacity('--tc-red-400'),
          500: withOpacity('--tc-red-500'),
          600: withOpacity('--tc-red-600'),
        },
        amber: {
          400: withOpacity('--tc-amber-400'),
          500: withOpacity('--tc-amber-500'),
          600: withOpacity('--tc-amber-600'),
        },
        blue: {
          400: withOpacity('--tc-blue-400'),
          500: withOpacity('--tc-blue-500'),
          600: withOpacity('--tc-blue-600'),
        },
      },
      fontFamily: {
        display: ['Inter', 'General Sans', 'sans-serif'],
        sans: ['General Sans', 'system-ui', 'sans-serif'],
        data: ['Geist', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
