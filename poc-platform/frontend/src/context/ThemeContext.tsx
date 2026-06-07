import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ConfigProvider, App, theme } from 'antd';
import type { GlobalToken } from 'antd/es/theme/interface';
import zhCN from 'antd/locale/zh_CN';

/* ── Design Tokens ─────────────────────────────────────────── */

const commonTokens = {
  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 6,
  // 自定义强调色
  colorPurple: '#722ED1',
};

const lightTokens = {
  ...commonTokens,
  // 品牌主色
  colorPrimary: '#2563EB',
  // 语义色
  colorSuccess: '#16A34A',
  colorWarning: '#D97706',
  colorError: '#DC2626',
  // 文字层级
  colorText: '#0F172A',
  colorTextSecondary: '#475569',
  colorTextTertiary: '#94A3B8',
  colorTextQuaternary: '#CBD5E1',
  // 背景层级
  colorBgLayout: '#F1F5F9',
  colorBgContainer: '#FFFFFF',
  colorBgElevated: '#FFFFFF',
  colorBgSpotlight: '#F8FAFC',
  // 填充
  colorFill: '#E2E8F0',
  colorFillSecondary: '#F1F5F9',
  colorFillTertiary: '#F8FAFC',
  colorFillQuaternary: '#F8FAFC',
  // 边框
  colorBorder: '#E2E8F0',
  colorBorderSecondary: '#F1F5F9',
  // 主色衍生
  colorPrimaryBg: '#EFF6FF',
  colorPrimaryBgHover: '#DBEAFE',
  colorPrimaryBorder: '#93C5FD',
  colorPrimaryBorderHover: '#60A5FA',
  colorPrimaryHover: '#3B82F6',
  colorPrimaryActive: '#1D4ED8',
  colorPrimaryTextHover: '#3B82F6',
  colorPrimaryText: '#2563EB',
  colorPrimaryTextActive: '#1D4ED8',
};

const darkTokens = {
  ...commonTokens,
  // 品牌主色（暗色模式稍亮）
  colorPrimary: '#3B82F6',
  // 语义色
  colorSuccess: '#22C55E',
  colorWarning: '#F59E0B',
  colorError: '#EF4444',
  // 文字层级
  colorText: '#F1F5F9',
  colorTextSecondary: '#94A3B8',
  colorTextTertiary: '#64748B',
  colorTextQuaternary: '#475569',
  // 背景层级
  colorBgLayout: '#0F172A',
  colorBgContainer: '#1E293B',
  colorBgElevated: '#1E293B',
  colorBgSpotlight: '#334155',
  // 填充
  colorFill: '#334155',
  colorFillSecondary: '#1E293B',
  colorFillTertiary: '#1E293B',
  colorFillQuaternary: '#1E293B',
  // 边框
  colorBorder: '#334155',
  colorBorderSecondary: '#1E293B',
  // 主色衍生
  colorPrimaryBg: '#1E3A5F',
  colorPrimaryBgHover: '#1E40AF',
  colorPrimaryBorder: '#2563EB',
  colorPrimaryBorderHover: '#3B82F6',
  colorPrimaryHover: '#60A5FA',
  colorPrimaryActive: '#2563EB',
  colorPrimaryTextHover: '#60A5FA',
  colorPrimaryText: '#3B82F6',
  colorPrimaryTextActive: '#2563EB',
};

/* ── Context ───────────────────────────────────────────────── */

interface ThemeCtx {
  dark: boolean;
  toggle: () => void;
  token: GlobalToken;
}

const ThemeContext = createContext<ThemeCtx>({
  dark: false,
  toggle: () => {},
  token: {} as GlobalToken,
});

export function useTheme() {
  return useContext(ThemeContext);
}

/* ── Provider ──────────────────────────────────────────────── */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = () => setDark((v) => !v);

  const algorithm = dark ? theme.darkAlgorithm : theme.defaultAlgorithm;
  const tokens = dark ? darkTokens : lightTokens;

  return (
    <ThemeContext.Provider value={{ dark, toggle, token: tokens as unknown as GlobalToken }}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm,
          token: tokens,
        }}
      >
        <App>
          {children}
        </App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
