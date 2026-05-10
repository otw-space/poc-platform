import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ProjectList from './pages/ProjectList';
import ProjectForm from './pages/ProjectForm';
import ProjectDetail from './pages/ProjectDetail';
import DashboardCanvas from './pages/DashboardCanvas';
import DashboardHome from './pages/DashboardHome';
import Settings from './pages/Settings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spin style={{ display: 'block', margin: '200px auto' }} />;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <Spin style={{ display: 'block', margin: '200px auto' }} />;
  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="projects" element={<ProjectList />} />
        <Route path="projects/new" element={<ProjectForm />} />
        <Route path="projects/:id/edit" element={<ProjectForm />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="dashboards" element={<DashboardCanvas />} />
        <Route
          path="settings"
          element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}
