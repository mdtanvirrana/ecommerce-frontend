"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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

  const refreshCustomer = useCallback(async (): Promise<Customer | null> => {
    try {
      const res = await customerAuthApi.me();
      setCustomer(res.data);
      return res.data;
    } catch {
      setCustomer(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    customerAuthApi
      .me()
      .then((res) => {
        if (active) setCustomer(res.data);
      })
      .catch(() => {
        if (active) setCustomer(null);
      })
      .finally(() => {
        if (active) setLoading(false);
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
      setCustomer(res.data.user);
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
      setCustomer(res.data.user);
      await mergePendingGuestCart();
      return res.data.user;
    },
    [mergePendingGuestCart],
  );

  const logout = useCallback(async () => {
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
