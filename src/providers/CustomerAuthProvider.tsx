"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cartApi, customerAuthApi } from "@/services/api";
import { clearGuestCart, readGuestCart } from "@/lib/guestCart";
import type { Customer } from "@/types/api";

interface CustomerAuthContextValue {
  customer: Customer | null;
  loading: boolean;
  refreshCustomer: () => Promise<Customer | null>;
  login: (email: string, password: string) => Promise<Customer>;
  register: (payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    password_confirmation: string;
  }) => Promise<Customer>;
  logout: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const authVersionRef = useRef(0);

  const refreshCustomer = useCallback(async (): Promise<Customer | null> => {
    const reqVersion = ++authVersionRef.current;
    try {
      const res = await customerAuthApi.me();
      if (authVersionRef.current === reqVersion) {
        setCustomer(res.data);
      }
      return res.data;
    } catch {
      if (authVersionRef.current === reqVersion) {
        setCustomer(null);
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
    customerAuthApi
      .me()
      .then((res) => {
        if (active && authVersionRef.current === reqVersion) {
          setCustomer(res.data);
        }
      })
      .catch(() => {
        if (active && authVersionRef.current === reqVersion) {
          setCustomer(null);
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

  const mergePendingGuestCart = useCallback(async () => {
    const guestItems = readGuestCart();
    if (guestItems.length === 0) return;
    try {
      await cartApi.mergeGuestCart(
        guestItems.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          selected_color: i.selected_color,
          selected_size: i.selected_size,
        })),
      );
      clearGuestCart();
    } catch {
      // keep guest cart intact if merge fails
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<Customer> => {
      const res = await customerAuthApi.login({ email, password });
      authVersionRef.current += 1;
      setCustomer(res.data.user);
      setLoading(false);
      await mergePendingGuestCart();
      return res.data.user;
    },
    [mergePendingGuestCart],
  );

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      password_confirmation: string;
    }): Promise<Customer> => {
      const res = await customerAuthApi.register(payload);
      authVersionRef.current += 1;
      setCustomer(res.data.user);
      setLoading(false);
      await mergePendingGuestCart();
      return res.data.user;
    },
    [mergePendingGuestCart],
  );

  const logout = useCallback(async () => {
    authVersionRef.current += 1;
    await customerAuthApi.logout();
    setCustomer(null);
  }, []);

  return (
    <CustomerAuthContext.Provider
      value={{ customer, loading, refreshCustomer, login, register, logout }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error("useCustomerAuth must be used inside CustomerAuthProvider");
  }
  return ctx;
}
