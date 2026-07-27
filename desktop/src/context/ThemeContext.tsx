import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getConfig, setConfig } from '@/lib/configStore';

export type ThemeId = 'light' | 'purple' | 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  gradient: string;
  badgeBg: string;
  badgeBorder: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'blue',
    name: 'Ocean Sapphire',
    tagline: 'Royal Sapphire & Sky Cyan',
    primaryColor: '#3b82f6',
    accentColor: '#06b6d4',
    gradient: 'from-[#3b82f6] to-[#06b6d4]',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeBorder: 'rgba(59, 130, 246, 0.3)',
  },
  {
    id: 'purple',
    name: 'Electric Purple',
    tagline: 'Cyber Obsidian & Vibrant Violet',
    primaryColor: '#8b5cf6',
    accentColor: '#d946ef',
    gradient: 'from-[#8b5cf6] to-[#d946ef]',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    badgeBorder: 'rgba(139, 92, 246, 0.3)',
  },
  {
    id: 'light',
    name: 'Daylight Pearl',
    tagline: 'Clean Light Porcelain & Royal Indigo',
    primaryColor: '#4f46e5',
    accentColor: '#7c3aed',
    gradient: 'from-[#4f46e5] to-[#7c3aed]',
    badgeBg: 'rgba(79, 70, 229, 0.12)',
    badgeBorder: 'rgba(79, 70, 229, 0.25)',
  },
  {
    id: 'emerald',
    name: 'Emerald Mint',
    tagline: 'Matrix Green & Cyan Mint',
    primaryColor: '#10b981',
    accentColor: '#06b6d4',
    gradient: 'from-[#10b981] to-[#06b6d4]',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeBorder: 'rgba(16, 185, 129, 0.3)',
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    tagline: 'Solar Gold & Fiery Crimson',
    primaryColor: '#f59e0b',
    accentColor: '#f43f5e',
    gradient: 'from-[#f59e0b] to-[#f43f5e]',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeBorder: 'rgba(245, 158, 11, 0.3)',
  },
  {
    id: 'rose',
    name: 'Neon Rose',
    tagline: 'Velvet Crimson & Magenta',
    primaryColor: '#f43f5e',
    accentColor: '#ec4899',
    gradient: 'from-[#f43f5e] to-[#ec4899]',
    badgeBg: 'rgba(244, 63, 94, 0.15)',
    badgeBorder: 'rgba(244, 63, 94, 0.3)',
  },
  {
    id: 'slate',
    name: 'Nordic Slate',
    tagline: 'Midnight Frost & Ice Cyan',
    primaryColor: '#38bdf8',
    accentColor: '#6366f1',
    gradient: 'from-[#38bdf8] to-[#6366f1]',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    badgeBorder: 'rgba(56, 189, 248, 0.3)',
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  themes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'xona_color_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = getConfig(STORAGE_KEY) as ThemeId;
    if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
      return saved;
    }
    return 'blue';
  });

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    setConfig(STORAGE_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEME_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
