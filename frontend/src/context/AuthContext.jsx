import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axiosInstance';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Expose setter for axios interceptor
  useEffect(() => {
    window.__wathi9ati_set_user__ = (u) => {
      setUser(u);
    };
    window.__wathi9ati_logout__ = () => {
      logout();
    };
    return () => {
      delete window.__wathi9ati_set_user__;
      delete window.__wathi9ati_logout__;
    };
  }, []);

  // Keep global token in sync
  useEffect(() => {
    window.__wathi9ati_access_token__ = accessToken;
  }, [accessToken]);

  // Attempt silent refresh on mount
  useEffect(() => {
    silentRefresh();
  }, []);

  async function silentRefresh() {
    try {
      const { data } = await api.post('/auth/refresh');
      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch {
      // Not logged in — that's fine
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password, confirmPassword) => {
    const { data } = await api.post('/auth/register', {
      name,
      email,
      password,
      confirmPassword,
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    } finally {
      setAccessToken(null);
      setUser(null);
      window.__wathi9ati_access_token__ = null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
