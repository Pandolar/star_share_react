import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import adminApiService from '../services/adminApi';
import type { AdminPrincipal } from '../types/admin';

interface AdminAuthValue {
  principal: AdminPrincipal | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refresh: () => Promise<AdminPrincipal | null>;
  clear: () => void;
  logout: () => Promise<void>;
  can: (permission?: string | null) => boolean;
  canAny: (...permissions: string[]) => boolean;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [principal, setPrincipal] = useState<AdminPrincipal | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clear = useCallback(() => {
    adminApiService.clearLocalSession();
    setPrincipal(null);
    setIsLoading(false);
  }, []);

  const refresh = useCallback(async (): Promise<AdminPrincipal | null> => {
    if (!adminApiService.hasAdminToken()) {
      setPrincipal(null);
      setIsLoading(false);
      return null;
    }
    setIsLoading(true);
    try {
      const response = await adminApiService.getMe();
      if (response.code !== 20000 || !response.data) {
        clear();
        return null;
      }
      setPrincipal(response.data);
      return response.data;
    } catch {
      clear();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [clear]);

  const logout = useCallback(async () => {
    try {
      await adminApiService.logout();
    } finally {
      setPrincipal(null);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const invalidate = () => {
      setPrincipal(null);
      setIsLoading(false);
    };
    window.addEventListener('admin-auth-invalid', invalidate);
    return () => window.removeEventListener('admin-auth-invalid', invalidate);
  }, []);

  const value = useMemo<AdminAuthValue>(() => ({
    principal,
    isAuthenticated: Boolean(principal),
    isLoading,
    refresh,
    clear,
    logout,
    can: (permission) => !permission || Boolean(principal?.is_superadmin || principal?.permissions.includes(permission)),
    canAny: (...permissions) => Boolean(principal?.is_superadmin || permissions.some((permission) => principal?.permissions.includes(permission))),
  }), [clear, isLoading, logout, principal, refresh]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = (): AdminAuthValue => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return context;
};
