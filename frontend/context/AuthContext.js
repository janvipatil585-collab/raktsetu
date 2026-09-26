'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [activeDriveId, setActiveDriveIdState] = useState(null);
  const [drives, setDrives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const setActiveDriveId = useCallback((id) => {
    const numId = id ? Number(id) : null;
    setActiveDriveIdState(numId);
    if (typeof window !== 'undefined' && numId) {
      localStorage.setItem('active_drive_id', String(numId));
    }
  }, []);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedAccessToken = localStorage.getItem('access_token');
      const storedRefreshToken = localStorage.getItem('refresh_token');
      const storedDriveId = localStorage.getItem('active_drive_id');

      if (storedUser && storedAccessToken) {
        setUser(JSON.parse(storedUser));
        setTokens({ access: storedAccessToken, refresh: storedRefreshToken });
      }
      if (storedDriveId) {
        setActiveDriveIdState(Number(storedDriveId));
      }
    } catch (e) {
      console.error('Failed to parse auth from localStorage', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.non_field_errors?.[0] || 'Invalid credentials');
    }

    const userData = data.user;
    const tokenData = { access: data.access, refresh: data.refresh };

    setUser(userData);
    setTokens(tokenData);

    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);

    if (userData.role === 'volunteer') {
      router.push('/volunteer');
    } else {
      router.push('/dashboard');
    }
    return userData;
  }, [router]);

  const logout = useCallback(() => {
    setUser(null);
    setTokens(null);
    setActiveDriveIdState(null);
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('active_drive_id');
    router.push('/login');
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      tokens,
      isLoading,
      login,
      logout,
      activeDriveId,
      setActiveDriveId,
      drives,
      setDrives,
    }),
    [user, tokens, isLoading, login, logout, activeDriveId, setActiveDriveId, drives, setDrives]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
