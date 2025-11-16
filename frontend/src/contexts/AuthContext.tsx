import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';

export interface User {
  username: string;
  role: 'administrator' | 'employee';
  employee_id: string;
  password_reset_required: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionToken: string | null;
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
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = sessionStorage.getItem('sessionToken');
    const storedUsername = sessionStorage.getItem('username');
    const storedUserRole = sessionStorage.getItem('userRole');
    const storedEmployeeId = sessionStorage.getItem('employeeId');
    const storedPasswordReset = sessionStorage.getItem('passwordResetRequired');

    if (storedToken && storedUsername && storedUserRole && storedEmployeeId) {
      setSessionToken(storedToken);
      setUser({
        username: storedUsername,
        role: storedUserRole as 'administrator' | 'employee',
        employee_id: storedEmployeeId,
        password_reset_required: storedPasswordReset === 'true'
      });
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await api.login({ username, password });
      const role = (res.role === 'administrator' || res.role === 'employee') ? res.role : 'employee';

      const nextUser: User = {
        username: res.name,
        role: role,
        employee_id: res.employee_id,
        password_reset_required: res.password_reset_required
      };

      // Store in state
      setUser(nextUser);
      setSessionToken(res.access_token);

      // Store in sessionStorage
      sessionStorage.setItem('sessionToken', res.access_token);
      sessionStorage.setItem('username', nextUser.username);
      sessionStorage.setItem('userRole', nextUser.role);
      sessionStorage.setItem('employeeId', nextUser.employee_id);
      sessionStorage.setItem('passwordResetRequired', String(nextUser.password_reset_required));

      // Navigate to appropriate dashboard
      const dashboardPath = role === 'administrator' ? '/admin/dashboard' : '/employee/dashboard';
      navigate(dashboardPath);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setSessionToken(null);
    sessionStorage.removeItem('sessionToken');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('employeeId');
    sessionStorage.removeItem('passwordResetRequired');
    navigate('/login');
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading,
    sessionToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};