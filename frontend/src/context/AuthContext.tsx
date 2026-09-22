import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'SYSTEM_ADMIN' | 'COMPANY_ADMIN' | 'RECEPTIONIST' | 'BARBER' | 'CLIENT';
  branchIds?: string[];
}

interface AuthContextType {
  user: User | null;
  login: (phone: string, password?: string) => Promise<any>;
  requestOtp: (phone: string) => Promise<any>;
  verifyOtpAndLogin: (name: string, phone: string, code: string) => Promise<any>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user_info');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isLoading, setIsLoading] = useState(false);

  const clearSession = () => {
    setUser(null);
    localStorage.removeItem('user_info');
  };

  useEffect(() => {
    // Dispatched by the axios interceptor in api/client.ts when a token
    // refresh fails - keeps this in-memory user state from going stale
    // relative to what api/client.ts already cleared from localStorage.
    window.addEventListener('auth:session-expired', clearSession);
    return () => window.removeEventListener('auth:session-expired', clearSession);
  }, []);

  useEffect(() => {
    // Security: if the browser restores this page from its back/forward
    // cache (e.g. the user hits Back after logging out), `event.persisted`
    // is true and none of this app's JS re-runs - the last-rendered
    // dashboard would otherwise just sit there, frozen, still showing
    // whatever data was on screen at logout time. Forcing a real reload
    // re-runs this provider's init (re-reads `user_info` from localStorage),
    // so a logged-out visitor is correctly bounced back to a login prompt
    // instead of seeing a stale authenticated page.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const login = async (phone: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { phone, password });
      const { user: userData } = res.data;
      setUser(userData);
      localStorage.setItem('user_info', JSON.stringify(userData));
      return userData;
    } finally {
      setIsLoading(false);
    }
  };

  const requestOtp = async (phone: string) => {
    return apiClient.post('/auth/otp/request', { phone });
  };

  const verifyOtpAndLogin = async (name: string, phone: string, code: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/otp/verify-login', { phone, code, name });
      const { user: userData } = res.data;
      setUser(userData);
      localStorage.setItem('user_info', JSON.stringify(userData));
      return userData;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    void apiClient.post('/auth/logout').catch(() => undefined);
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, login, requestOtp, verifyOtpAndLogin, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
