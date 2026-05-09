import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, theme } from 'antd';
import {
  ProjectOutlined,
  DashboardOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Header, Content } = AntLayout;

export default function Layout() {
  const { user, setUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const menuItems = [
    { key: '/projects', icon: <ProjectOutlined />, label: '项目管理' },
    { key: '/dashboards', icon: <DashboardOutlined />, label: '数据仪表盘' },
    ...(isAdmin ? [{ key: '/settings', icon: <SettingOutlined />, label: '系统设置' }] : []),
  ];

  const selectedKey = '/' + location.pathname.split('/')[1];

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', background: token.colorBgContainer, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginRight: 40, whiteSpace: 'nowrap' }}>PoC 管理平台</div>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, border: 'none' }}
        />
        <span style={{ marginRight: 16 }}>{user?.display_name}</span>
        <Button icon={<LogoutOutlined />} onClick={handleLogout}>退出</Button>
      </Header>
      <Content style={{ padding: 24, background: token.colorBgLayout }}>
        <Outlet />
      </Content>
    </AntLayout>
  );
}
