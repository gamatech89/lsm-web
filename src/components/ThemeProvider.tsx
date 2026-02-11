/**
 * Theme Provider
 * 
 * Wraps the app with Ant Design ConfigProvider and applies
 * the appropriate theme based on user preference.
 */

import { ConfigProvider, App as AntApp } from 'antd';
import { ReactNode } from 'react';
import { useThemeStore } from '@/stores/theme';
import { lightTheme, darkTheme } from '@/styles/theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { resolvedTheme } = useThemeStore();
  const currentTheme = resolvedTheme === 'dark' ? darkTheme : lightTheme;

  return (
    <ConfigProvider theme={currentTheme}>
      <AntApp>
        {children}
      </AntApp>
    </ConfigProvider>
  );
}
