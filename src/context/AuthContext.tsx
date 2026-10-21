import React, { createContext, useContext, useEffect, useState } from 'react';
import { Admin } from '../types';
import { api, getStoredToken } from '../lib/api';

interface AuthContextType {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // Check stored token or cookie session
      const res = await api.auth.me();
      if (res && res.admin) {
        setAdmin(res.admin);
      } else {
        setAdmin(null);
      }
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      setAdmin(null);
    };

    window.addEventListener('smartreview:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('smartreview:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.auth.login(email, pass);
    setAdmin(res.admin);
  };

  const logout = async () => {
    await api.auth.logout();
    setAdmin(null);
  };

  const refresh = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
