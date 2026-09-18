import React, { createContext, useContext, useState, useLayoutEffect } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'truecut_theme';

// DESIGN.md "Color" section - kept in sync with index.css's fallback values.
// Applied as inline custom properties on <html> (rather than relying on a
// [data-theme] CSS selector in index.css) because this project's Tailwind/
// PostCSS build pipeline was observed to silently drop hand-authored
// html/:root rules from index.css during compilation - inline styles bypass
// that stylesheet entirely and always win the cascade, so this is the
// reliable way to drive the theme regardless of that build quirk.
const PALETTES: Record<Theme, Record<string, string>> = {
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
  },
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
