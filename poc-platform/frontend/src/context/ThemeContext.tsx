import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ConfigProvider, theme } from 'antd';

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

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <ConfigProvider
        theme={{
          algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: dark ? {
            colorBgElevated: '#1f1f1f',
            colorBgContainer: '#141414',
            colorBgLayout: '#000000',
            colorBgSpotlight: '#1f1f1f',
          } : {},
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
