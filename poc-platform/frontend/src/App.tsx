import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ProjectList from './pages/ProjectList';
import ProjectForm from './pages/ProjectForm';
import ProjectDetail from './pages/ProjectDetail';
import DashboardCanvas from './pages/DashboardCanvas';
import SopCenter from './pages/SopCenter';
import DashboardHome from './pages/DashboardHome';
import RecycleBin from './pages/RecycleBin';
import Settings from './pages/Settings';
import DispatchMap from './pages/DispatchMap';
const Diagrams = lazy(() => import('./pages/Diagrams'));
import Profile from './pages/Profile';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spin style={{ display: 'block', margin: '200px auto' }} />;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function PermissionRoute({ children, module, action = 'view' }: { children: React.ReactNode; module: string; action?: string }) {
  const { user, loading, hasPermission } = useAuth();
  if (loading) return <Spin style={{ display: 'block', margin: '200px auto' }} />;
  if (!user) return <Navigate to="/login" />;
  if (!hasPermission(module, action)) return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
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
        <Route path="profile" element={<Profile />} />
        <Route path="sop" element={<SopCenter />} />
        <Route path="recycle-bin" element={<RecycleBin />} />
        <Route path="dispatch-map" element={<DispatchMap />} />
        <Route path="diagrams" element={<Suspense fallback={<Spin style={{ display: 'block', margin: '100px auto' }} />}><Diagrams /></Suspense>} />
        <Route
          path="settings"
          element={
            <PermissionRoute module="settings">
              <Settings />
            </PermissionRoute>
          }
        />
      </Route>
    </Routes>
    </ThemeProvider>
  );
}
