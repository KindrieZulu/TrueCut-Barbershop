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
// with that doc. Converted to "R G B" triplets below because
// tailwind.config.js's opacity-modifier syntax (e.g. bg-gold-500/10) only
// works when the underlying CSS variable is a bare RGB triplet consumed via
// rgb(var(--x) / <alpha-value>) - a variable holding a hex string like
// "#d4af37" makes Tailwind's opacity modifier silently resolve to
// transparent instead of a translucent color.
const PALETTE_HEX: Record<Theme, Record<string, string>> = {
  dark: {
    '--tc-dark-900': '#0a0a0c',
    '--tc-dark-800': '#141417',
    '--tc-dark-700': '#1c1c20',
    '--tc-dark-600': '#2a2a2f',
    '--tc-gold-400': '#e8c65a',
    '--tc-gold-500': '#d4af37',
    '--tc-gold-600': '#a8842a',
    '--tc-text': '#f5f5f4',
    '--tc-text-soft': '#d4d4d8',
    '--tc-text-muted': '#9a9a9f',
    '--tc-text-faint': '#6b6b70',
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
    '--tc-dark-900': '#f6f5f2',
    '--tc-dark-800': '#ffffff',
    '--tc-dark-700': '#eeece6',
    '--tc-dark-600': '#ddd9d0',
    '--tc-gold-400': '#8f6414',
    '--tc-gold-500': '#a8791f',
    '--tc-gold-600': '#6b4d10',
    '--tc-text': '#17171a',
    '--tc-text-soft': '#3f3f43',
    '--tc-text-muted': '#6b6b70',
    '--tc-text-faint': '#8a8a8f',
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
