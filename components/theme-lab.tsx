'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type ThemeLabTheme = 'atelier' | 'tactile' | 'swiss';

const themes: { id: ThemeLabTheme; label: string }[] = [
  { id: 'atelier', label: 'Atelier' },
  { id: 'tactile', label: 'Tactile' },
  { id: 'swiss', label: 'Swiss' },
];

export function useThemeLab() {
  const [theme, setTheme] = useState<ThemeLabTheme>('atelier');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem('promo-pulse-theme-lab');
      if (saved === 'atelier' || saved === 'tactile' || saved === 'swiss') setTheme(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectTheme = (nextTheme: ThemeLabTheme) => {
    setTheme(nextTheme);
    window.localStorage.setItem('promo-pulse-theme-lab', nextTheme);
  };

  return { theme, selectTheme };
}

export function ThemeLab({ theme, onSelect }: { theme: ThemeLabTheme; onSelect: (theme: ThemeLabTheme) => void }) {
  return (
    <div className="pp-theme-lab" aria-label="Theme Lab">
      <span className="pp-theme-lab__label">Theme Lab</span>
      <div className="pp-theme-lab__options">
        {themes.map((item) => (
          <button
            aria-pressed={theme === item.id}
            className={cn('pp-theme-lab__option', theme === item.id && 'is-active')}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
