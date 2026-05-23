import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ConfigProvider, App, theme } from 'antd';

interface ThemeCtx {
  dark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({ dark: false, toggle: () => {} });

export function useTheme() { return useContext(ThemeContext); }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = () => setDark((v) => !v);

  const themeConfig = { algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm };

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <ConfigProvider theme={themeConfig}>
        <App>
          {children}
        </App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
