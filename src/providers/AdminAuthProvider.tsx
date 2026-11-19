"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminAuthApi } from "@/services/api";
import type { Staff } from "@/types/api";

interface AdminAuthContextValue {
  staff: Staff | null;
  loading: boolean;
  refreshStaff: () => Promise<Staff | null>;
  login: (email: string, password: string) => Promise<Staff>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStaff = useCallback(async (): Promise<Staff | null> => {
    try {
      const res = await adminAuthApi.me();
      setStaff(res.data);
      return res.data;
    } catch {
      setStaff(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    adminAuthApi
      .me()
      .then((res) => {
        if (active) setStaff(res.data);
      })
      .catch(() => {
        if (active) setStaff(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<Staff> => {
    const res = await adminAuthApi.login({ email, password });
    setStaff(res.data.staff);
    return res.data.staff;
  }, []);

  const logout = useCallback(async () => {
    await adminAuthApi.logout();
    setStaff(null);
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!staff) return false;
      if (staff.is_super_admin) return true;
      return staff.permissions.includes(permission);
    },
    [staff],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!staff) return false;
      if (staff.is_super_admin) return true;
      return permissions.some((p) => staff.permissions.includes(p));
    },
    [staff],
  );

  return (
    <AdminAuthContext.Provider
      value={{ staff, loading, refreshStaff, login, logout, hasPermission, hasAnyPermission }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  }
  return ctx;
}
