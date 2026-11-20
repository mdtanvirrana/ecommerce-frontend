"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { adminAuthApi } from "@/services/api";
import type { Staff } from "@/types/api";

export type AdminLoginResult =
  | { requiresTwoFactor: true; twoFactorToken: string }
  | { requiresTwoFactor: false; staff: Staff };

interface AdminAuthContextValue {
  staff: Staff | null;
  loading: boolean;
  refreshStaff: () => Promise<Staff | null>;
  login: (email: string, password: string) => Promise<AdminLoginResult>;
  completeTwoFactor: (
    twoFactorToken: string,
    code: string,
  ) => Promise<{ staff: Staff; usedRecoveryCode: boolean }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const authVersionRef = useRef(0);

  const refreshStaff = useCallback(async (): Promise<Staff | null> => {
    const reqVersion = ++authVersionRef.current;
    try {
      const res = await adminAuthApi.me();
      if (authVersionRef.current === reqVersion) {
        setStaff(res.data);
      }
      return res.data;
    } catch {
      if (authVersionRef.current === reqVersion) {
        setStaff(null);
      }
      return null;
    } finally {
      if (authVersionRef.current === reqVersion) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    const reqVersion = authVersionRef.current;
    adminAuthApi
      .me()
      .then((res) => {
        if (active && authVersionRef.current === reqVersion) {
          setStaff(res.data);
        }
      })
      .catch(() => {
        if (active && authVersionRef.current === reqVersion) {
          setStaff(null);
        }
      })
      .finally(() => {
        if (active && authVersionRef.current === reqVersion) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AdminLoginResult> => {
      const res = await adminAuthApi.login({ email, password });
      if (res.data.requires_two_factor && res.data.two_factor_token) {
        return {
          requiresTwoFactor: true,
          twoFactorToken: res.data.two_factor_token,
        };
      }
      if (!res.data.staff) {
        throw new Error("Invalid staff authentication response.");
      }
      authVersionRef.current += 1;
      setStaff(res.data.staff);
      setLoading(false);
      return { requiresTwoFactor: false, staff: res.data.staff };
    },
    [],
  );

  const completeTwoFactor = useCallback(
    async (
      twoFactorToken: string,
      code: string,
    ): Promise<{ staff: Staff; usedRecoveryCode: boolean }> => {
      const res = await adminAuthApi.verifyTwoFactorChallenge({
        two_factor_token: twoFactorToken,
        code,
      });
      authVersionRef.current += 1;
      setStaff(res.data.staff);
      setLoading(false);
      return {
        staff: res.data.staff,
        usedRecoveryCode: Boolean(res.data.used_recovery_code),
      };
    },
    [],
  );

  const logout = useCallback(async () => {
    authVersionRef.current += 1;
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
      value={{
        staff,
        loading,
        refreshStaff,
        login,
        completeTwoFactor,
        logout,
        hasPermission,
        hasAnyPermission,
      }}
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
