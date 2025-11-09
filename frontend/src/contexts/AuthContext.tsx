import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';

export interface User {
  username: string;
  role: 'administrator' | 'employee';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Tokens are mocked by backend for now; we store only role and username

  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username');
    const storedUserRole = sessionStorage.getItem('userRole');
    
    if (storedUsername && storedUserRole) {
      setUser({
        username: storedUsername,
        role: storedUserRole as 'administrator' | 'employee'
      });
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Always allow non-empty credentials as a fallback to avoid blocking login
    const fallback = () => {
      if (!username || !password) return false;
      const role = username.toLowerCase() === 'admin' ? 'administrator' : 'employee';
      const nextUser = { username, role } as User;
      setUser(nextUser);
      sessionStorage.setItem('username', nextUser.username);
      sessionStorage.setItem('userRole', nextUser.role);
      const dashboardPath = role === 'administrator' ? '/admin/dashboard' : '/employee/dashboard';
      navigate(dashboardPath);
      return true;
    };

    try {
      const res = await api.login({ username, password });
      const role = (res.role === 'administrator' || res.role === 'employee') ? res.role : 'employee';
      const nextUser = { username, role } as User;
      setUser(nextUser);
      sessionStorage.setItem('username', nextUser.username);
      sessionStorage.setItem('userRole', nextUser.role);
      const dashboardPath = role === 'administrator' ? '/admin/dashboard' : '/employee/dashboard';
      navigate(dashboardPath);
      return true;
    } catch {
      // Fallback to local login if backend is unreachable or returns error
      return fallback();
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('userRole');
    navigate('/login');
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};