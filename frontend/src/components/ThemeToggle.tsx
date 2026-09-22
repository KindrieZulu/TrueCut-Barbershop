import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="inline-flex items-center gap-1 bg-dark-900 border border-dark-600 rounded-full p-1"
      role="radiogroup"
      aria-label="Theme"
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          theme === 'dark' ? 'bg-gold-500 text-gray-50' : 'text-gray-400 hover:text-white'
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
        {!compact && <span>Dark</span>}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        onClick={() => setTheme('light')}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          theme === 'light' ? 'bg-gold-500 text-gray-50' : 'text-gray-400 hover:text-white'
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
        {!compact && <span>Light</span>}
      </button>
    </div>
  );
};
