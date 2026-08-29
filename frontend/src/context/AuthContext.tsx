import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  quickLogin: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('slidms_access_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch user session:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { accessToken, user: userData } = res.data.data;
      localStorage.setItem('slidms_access_token', accessToken);
      setToken(accessToken);
      setUser(userData);
    } else {
      throw new Error(res.data.error?.message || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('slidms_access_token');
    setToken(null);
    setUser(null);
  };

  const quickLogin = async (role: UserRole) => {
    const emailMap: Record<UserRole, string> = {
      INVESTIGATOR: 'investigator@police.gov.in',
      SENIOR_OFFICER: 'senior@police.gov.in',
      FORENSIC_OFFICER: 'forensic@lab.gov.in',
      ADMIN: 'admin@slidms.gov.in'
    };
    await login(emailMap[role], 'Password123!');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, quickLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

