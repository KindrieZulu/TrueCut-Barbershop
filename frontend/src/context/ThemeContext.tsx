import React, { createContext, useContext, useState, useLayoutEffect } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'truecut_theme';

// DESIGN.md "Color" section - hex values kept here for readability/parity
// with that doc. The `--tc-gold-*` name is legacy (kept to avoid a repo-wide
// class-name rename); it now holds the site's maroon accent, not gold. The
// `--tc-dark-*` neutrals lean warm (near-black in dark mode, beige/cream in
// light mode) to pair with it. Converted to "R G B" triplets below because
// tailwind.config.js's opacity-modifier syntax (e.g. bg-gold-500/10) only
// works when the underlying CSS variable is a bare RGB triplet consumed via
// rgb(var(--x) / <alpha-value>) - a variable holding a hex string like
// "#d4af37" makes Tailwind's opacity modifier silently resolve to
// transparent instead of a translucent color.
const PALETTE_HEX: Record<Theme, Record<string, string>> = {
  dark: {
    '--tc-dark-900': '#120a0c',
    '--tc-dark-800': '#1c1114',
    '--tc-dark-700': '#271820',
    '--tc-dark-600': '#3a2530',
    '--tc-gold-400': '#e2924d',
    '--tc-gold-500': '#c97b3d',
    '--tc-gold-600': '#9c5a28',
    '--tc-text': '#f5efe8',
    '--tc-text-soft': '#d9cfc4',
    '--tc-text-muted': '#a89a8c',
    '--tc-text-faint': '#786a5e',
    // Semantic status colors (DESIGN.md "Color" > Semantic). Dark values are
    // the Tailwind defaults this app already shipped with - unchanged, so
    // existing dark-mode screens look identical. Light values shift deeper/
    // more saturated (the standard move for text/tint colors on a near-white
    // surface) so status text and badge tints stay readable in light mode
    // instead of reusing washed-out tints tuned for a near-black background.
    '--tc-green-400': '#4ade80',
    '--tc-green-500': '#22c55e',
    '--tc-green-600': '#16a34a',
    '--tc-red-400': '#f87171',
    '--tc-red-500': '#ef4444',
    '--tc-red-600': '#dc2626',
    '--tc-amber-400': '#fbbf24',
    '--tc-amber-500': '#f59e0b',
    '--tc-amber-600': '#d97706',
    '--tc-blue-400': '#60a5fa',
    '--tc-blue-500': '#3b82f6',
    '--tc-blue-600': '#2563eb',
  },
  light: {
    '--tc-dark-900': '#f3e9d8',
    '--tc-dark-800': '#fffcf5',
    '--tc-dark-700': '#e8dcc2',
    '--tc-dark-600': '#d8c7a0',
    '--tc-gold-400': '#a85f27',
    '--tc-gold-500': '#8a4a1d',
    '--tc-gold-600': '#6b3814',
    '--tc-text': '#2a1f18',
    '--tc-text-soft': '#4a3b2f',
    '--tc-text-muted': '#7a6a56',
    '--tc-text-faint': '#9c8d78',
    '--tc-green-400': '#16a34a',
    '--tc-green-500': '#16a34a',
    '--tc-green-600': '#15803d',
    '--tc-red-400': '#dc2626',
    '--tc-red-500': '#dc2626',
    '--tc-red-600': '#b91c1c',
    '--tc-amber-400': '#b45309',
    '--tc-amber-500': '#b45309',
    '--tc-amber-600': '#92400e',
    '--tc-blue-400': '#2563eb',
    '--tc-blue-500': '#2563eb',
    '--tc-blue-600': '#1d4ed8',
  },
};

function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

const PALETTES: Record<Theme, Record<string, string>> = {
  dark: Object.fromEntries(Object.entries(PALETTE_HEX.dark).map(([k, v]) => [k, hexToRgbTriplet(v)])),
  light: Object.fromEntries(Object.entries(PALETTE_HEX.light).map(([k, v]) => [k, hexToRgbTriplet(v)])),
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' ? 'light' : 'dark';
  });

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    const palette = PALETTES[theme];
    for (const [prop, value] of Object.entries(palette)) {
      root.style.setProperty(prop, value);
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (next: Theme) => setThemeState(next);
  const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
