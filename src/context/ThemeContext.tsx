import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeMode } from '../types';

interface ThemeContextType {
  theme: ThemeMode;
  isSunlight: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'zamzam_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'sunlight' || saved === 'dark') {
        return saved;
      }
    }
    return 'dark';
  });

  const applyTheme = (mode: ThemeMode) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const body = document.body;

    if (mode === 'sunlight') {
      root.classList.remove('dark');
      root.classList.add('theme-sunlight');
      body.classList.add('theme-sunlight');
      root.setAttribute('data-theme', 'sunlight');
    } else {
      root.classList.add('dark');
      root.classList.remove('theme-sunlight');
      body.classList.remove('theme-sunlight');
      root.setAttribute('data-theme', 'dark');
    }

    // Update meta theme-color for mobile address bar
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', mode === 'sunlight' ? '#F4F6F8' : '#0A1A0F');
  };

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage quota/private mode errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'sunlight' : 'dark'));
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isSunlight: theme === 'sunlight',
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
