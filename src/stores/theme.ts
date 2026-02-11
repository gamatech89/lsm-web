/**
 * Theme Store
 * 
 * Zustand store for managing light/dark theme preference.
 * Persists to localStorage and syncs with system preference.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

// Get system preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

// Resolve theme based on mode
const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolvedTheme: resolveTheme('system'),
      
      setMode: (mode: ThemeMode) => {
        const resolvedTheme = resolveTheme(mode);
        set({ mode, resolvedTheme });
        
        // Update document class
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(resolvedTheme);
          document.documentElement.setAttribute('data-theme', resolvedTheme);
        }
      },
      
      toggleTheme: () => {
        const currentMode = get().mode;
        const newMode: ThemeMode = currentMode === 'light' ? 'dark' : 
                                   currentMode === 'dark' ? 'light' : 
                                   getSystemTheme() === 'dark' ? 'light' : 'dark';
        get().setMode(newMode);
      },
    }),
    {
      name: 'lsm-theme',
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Re-resolve theme and apply to document
          const resolvedTheme = resolveTheme(state.mode);
          state.resolvedTheme = resolvedTheme;
          
          if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(resolvedTheme);
            document.documentElement.setAttribute('data-theme', resolvedTheme);
          }
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const store = useThemeStore.getState();
    if (store.mode === 'system') {
      const resolvedTheme = e.matches ? 'dark' : 'light';
      useThemeStore.setState({ resolvedTheme });
      
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolvedTheme);
      document.documentElement.setAttribute('data-theme', resolvedTheme);
    }
  });
}
