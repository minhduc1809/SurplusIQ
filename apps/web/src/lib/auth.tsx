import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { api, setToken } from './api';

interface StoreUser {
  id: string;
  role: string;
  email: string | null;
  phone: string | null;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: StoreUser;
}

interface AuthState {
  user: StoreUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORED_USER_KEY = 'sq_store_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoreUser | null>(() => {
    const raw = localStorage.getItem(STORED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    const deviceId = 'web-' + (localStorage.getItem('sq_device_id') || crypto.randomUUID());
    localStorage.setItem('sq_device_id', deviceId);
    const res = await api.post<LoginResponse>('/auth/store/login', { email, password, deviceId });
    setToken(res.accessToken);
    localStorage.setItem(STORED_USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem(STORED_USER_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
