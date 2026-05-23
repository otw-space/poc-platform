import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, theme, Dropdown } from 'antd';
import {
  HomeOutlined,
  ProjectOutlined,
  DashboardOutlined,
  BookOutlined,
  SettingOutlined,
  DeleteOutlined,
  LogoutOutlined,
  UserOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const { Sider, Content, Header } = AntLayout;

export default function Layout() {
  const { user, setUser, hasPermission } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);

  // Lock body-level scroll and sync body background with theme
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.style.background = dark ? '#141414' : '#fff';
    // CSS variables for theme-aware inline styles
    const root = document.documentElement;
    root.style.setProperty('--active-bg', dark ? 'rgba(23,125,220,0.25)' : '#e6f4ff');
    root.style.setProperty('--border-color', dark ? 'rgba(255,255,255,0.06)' : '#fafafa');
    return () => { document.body.style.overflow = prev; };
  }, [dark]);

  const menuItems = [
    ...(hasPermission('project', 'view') ? [{ key: '/', icon: <HomeOutlined />, label: '数据概览' }] : []),
    ...(hasPermission('project', 'view') ? [{ key: '/projects', icon: <ProjectOutlined />, label: '项目管理' }] : []),
    ...(hasPermission('dashboard', 'view') ? [{ key: '/dashboards', icon: <DashboardOutlined />, label: '数据仪表盘' }] : []),
    ...(hasPermission('sop', 'view') ? [{ key: '/sop', icon: <BookOutlined />, label: 'SOP中心' }] : []),
    ...(hasPermission('recycle_bin', 'view') ? [{ key: '/recycle-bin', icon: <DeleteOutlined />, label: '回收站' }] : []),
    ...(hasPermission('settings', 'view') ? [{ key: '/settings', icon: <SettingOutlined />, label: '系统设置' }] : []),
  ];

  const selectedKey = '/' + location.pathname.split('/')[1];

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <AntLayout style={{ height: '100vh', overflow: 'hidden', background: dark ? '#141414' : undefined }}>
      {/* Top Header Bar — fixed, never scrolls */}
      <Header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 48, lineHeight: '48px',
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>
          PoC 管理平台
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            size="small"
            type="text"
            icon={dark ? <MoonOutlined /> : <SunOutlined />}
            onClick={toggleTheme}
          />
          <Dropdown
            menu={{
              items: [
                { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
              ],
              onClick: ({ key }) => {
                if (key === 'profile') navigate('/profile');
                if (key === 'logout') handleLogout();
              },
            }}
          >
            <a style={{ fontSize: 14, cursor: 'pointer', color: token.colorTextSecondary }}>
              {user?.display_name}
            </a>
          </Dropdown>
        </div>
      </Header>

      {/* Body: Sider + Content */}
      <AntLayout style={{ flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar — scrolls independently when mouse is over it */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          breakpoint="lg"
          collapsedWidth={64}
          width={220}
          style={{
            background: token.colorBgContainer,
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            overflow: 'auto',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ borderInlineEnd: 'none' }}
          />
        </Sider>

        {/* Main content area — scrolls independently */}
        <Content style={{
          padding: 24,
          background: token.colorBgLayout,
          overflow: 'auto',
        }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
