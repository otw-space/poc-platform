import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getMe, getMyPermissions, type User } from '../api/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  isAdmin: boolean;
  permissions: string[];
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  setUser: () => {},
  isAdmin: false,
  permissions: [],
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      Promise.all([getMe(), getMyPermissions()])
        .then(([userRes, permsRes]) => {
          setUser(userRes.data);
          setPermissions(permsRes.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const hasPermission = (module: string, action: string) => {
    // Legacy admin users have full access (backward compatibility)
    if (user?.role === 'admin') return true;
    return permissions.includes(`${module}:${action}`);
  };

  // isAdmin: true if user has the super admin role or legacy admin role
  const isAdmin = user?.role === 'admin' || permissions.includes('project:create');

  return (
    <AuthContext.Provider value={{ user, loading, setUser, isAdmin, permissions, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
