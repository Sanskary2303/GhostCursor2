import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ThemeContextValue {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'shophive_theme_dark';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const setDarkMode = (val: boolean) => {
    setDarkModeState(val);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, String(val));
    } catch {
      /* ignore storage errors */
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      document.body.classList.add('bg-gray-900', 'text-gray-100');
      document.body.classList.remove('bg-gray-50', 'text-gray-900');
    } else {
      root.classList.remove('dark');
      document.body.classList.add('bg-gray-50', 'text-gray-900');
      document.body.classList.remove('bg-gray-900', 'text-gray-100');
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return context;
}

