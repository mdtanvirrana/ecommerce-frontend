"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { cartApi, catalogApi } from "@/services/api";
import { useCustomerAuth } from "@/providers/CustomerAuthProvider";
import { clearGuestCart, type GuestCartItem, readGuestCart, writeGuestCart } from "@/lib/guestCart";
import { ApiError } from "@/lib/apiClient";
import type { CartSummary, Product } from "@/types/api";

interface CartContextValue {
  cart: CartSummary;
  loading: boolean;
  mutating: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (
    product: Product,
    quantity: number,
    selectedColor?: string | null,
    selectedSize?: string | null,
  ) => Promise<boolean>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  applyCoupon: (code: string) => Promise<{ ok: boolean; error?: string }>;
  removeCoupon: () => Promise<void>;
  clearLocalAfterCheckout: () => void;
}

const EMPTY_CART: CartSummary = {
  id: 0,
  items: [],
  item_count: 0,
  subtotal: "0.00",
  discount_amount: "0.00",
  shipping_amount: "0.00",
  total_amount: "0.00",
  coupon: null,
  coupon_notice: null,
};

const CartContext = createContext<CartContextValue | null>(null);

function buildGuestSummary(
  guestItems: GuestCartItem[],
  guestCoupon: { code: string; type: "percentage" | "fixed"; value: string; discount_amount: string } | null,
): CartSummary {
  let subtotalCents = 0;
  let itemCount = 0;

  const items = guestItems.map((gi, idx) => {
    const unitCents = Math.round(Number(gi.unit_price) * 100);
    const lineCents = unitCents * gi.quantity;
    subtotalCents += lineCents;
    itemCount += gi.quantity;

    return {
      id: idx + 1,
      product_id: gi.product_id,
      name: gi.name,
      slug: gi.slug,
      sku: gi.sku,
      image_url: gi.image_url,
      regular_price: gi.regular_price,
      discount_price: gi.discount_price,
      unit_price: gi.unit_price,
      quantity: gi.quantity,
      line_total: (lineCents / 100).toFixed(2),
      stock_quantity: gi.stock_quantity,
      is_available: gi.stock_quantity >= gi.quantity,
      selected_color: gi.selected_color,
      selected_size: gi.selected_size,
    };
  });

  const discountCents = guestCoupon ? Math.round(Number(guestCoupon.discount_amount) * 100) : 0;
  const afterDiscount = Math.max(0, subtotalCents - discountCents);
  const shippingCents = afterDiscount === 0 || afterDiscount >= 25000 ? 0 : 1500;
  const totalCents = afterDiscount + shippingCents;

  return {
    id: 0,
    items,
    item_count: itemCount,
    subtotal: (subtotalCents / 100).toFixed(2),
    discount_amount: (discountCents / 100).toFixed(2),
    shipping_amount: (shippingCents / 100).toFixed(2),
    total_amount: (totalCents / 100).toFixed(2),
    coupon: guestCoupon
      ? { id: 0, code: guestCoupon.code, type: guestCoupon.type, value: guestCoupon.value }
      : null,
    coupon_notice: null,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { customer, loading: authLoading } = useCustomerAuth();
  const [cart, setCart] = useState<CartSummary>(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [guestCoupon, setGuestCoupon] = useState<{
    code: string;
    type: "percentage" | "fixed";
    value: string;
    discount_amount: string;
  } | null>(null);

  const refreshCart = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (customer) {
        const res = await cartApi.getCart();
        setCart(res.data);
      } else {
        const guestItems = readGuestCart();
        setCart(buildGuestSummary(guestItems, guestCoupon));
      }
    } catch {
      setCart(EMPTY_CART);
    } finally {
      setLoading(false);
    }
  }, [authLoading, customer, guestCoupon]);

  useEffect(() => {
    if (authLoading) return;
    let active = true;

    async function load() {
      try {
        if (customer) {
          const res = await cartApi.getCart();
          if (active) setCart(res.data);
        } else {
          const guestItems = readGuestCart();
          if (active) setCart(buildGuestSummary(guestItems, guestCoupon));
        }
      } catch {
        if (active) setCart(EMPTY_CART);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [authLoading, customer, guestCoupon]);

  const addToCart = useCallback(
    async (
      product: Product,
      quantity: number,
      selectedColor?: string | null,
      selectedSize?: string | null,
    ): Promise<boolean> => {
      if (!product.in_stock || product.stock_quantity <= 0) {
        toast.error("This product is currently out of stock.");
        return false;
      }

      setMutating(true);
      try {
        if (customer) {
          const res = await cartApi.addItem({
            product_id: product.id,
            quantity,
            selected_color: selectedColor ?? null,
            selected_size: selectedSize ?? null,
          });
          setCart(res.data);
          toast.success(`${product.name} added to cart.`);
          return true;
        }

        // Guest cart persisted in localStorage; merges into MySQL on login
        const current = readGuestCart();
        const color = selectedColor ?? null;
        const size = selectedSize ?? null;
        const idx = current.findIndex(
          (i) =>
            i.product_id === product.id &&
            (i.selected_color ?? null) === color &&
            (i.selected_size ?? null) === size,
        );

        const nextQty = (idx >= 0 ? current[idx].quantity : 0) + quantity;
        if (nextQty > product.stock_quantity) {
          toast.error(`Only ${product.stock_quantity} unit(s) available.`);
          return false;
        }

        if (idx >= 0) {
          current[idx] = { ...current[idx], quantity: nextQty };
        } else {
          current.push({
            product_id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            image_url: product.primary_image_url ?? product.images?.[0]?.url ?? null,
            unit_price: product.effective_price,
            regular_price: product.regular_price,
            discount_price: product.discount_price,
            stock_quantity: product.stock_quantity,
            quantity,
            selected_color: color,
            selected_size: size,
          });
        }

        writeGuestCart(current);
        setGuestCoupon(null);
        setCart(buildGuestSummary(current, null));
        toast.success(`${product.name} added to cart.`);
        return true;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to add item to cart.");
        return false;
      } finally {
        setMutating(false);
      }
    },
    [customer],
  );

  const updateQuantity = useCallback(
    async (itemId: number, quantity: number) => {
      if (quantity < 1) return;
      setMutating(true);
      try {
        if (customer) {
          const res = await cartApi.updateItem(itemId, quantity);
          setCart(res.data);
          return;
        }

        const current = readGuestCart();
        const idx = itemId - 1;
        if (idx < 0 || idx >= current.length) return;
        if (quantity > current[idx].stock_quantity) {
          toast.error(`Only ${current[idx].stock_quantity} unit(s) available.`);
          return;
        }
        current[idx] = { ...current[idx], quantity };
        writeGuestCart(current);
        setGuestCoupon(null);
        setCart(buildGuestSummary(current, null));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to update quantity.");
      } finally {
        setMutating(false);
      }
    },
    [customer],
  );

  const removeItem = useCallback(
    async (itemId: number) => {
      setMutating(true);
      try {
        if (customer) {
          const res = await cartApi.removeItem(itemId);
          setCart(res.data);
          toast.success("Item removed from cart.");
          return;
        }

        const current = readGuestCart();
        const idx = itemId - 1;
        if (idx >= 0 && idx < current.length) {
          current.splice(idx, 1);
          writeGuestCart(current);
          setGuestCoupon(null);
          setCart(buildGuestSummary(current, null));
          toast.success("Item removed from cart.");
        }
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to remove item.");
      } finally {
        setMutating(false);
      }
    },
    [customer],
  );

  const applyCoupon = useCallback(
    async (code: string): Promise<{ ok: boolean; error?: string }> => {
      if (!code.trim()) {
        return { ok: false, error: "Please enter a promo code." };
      }
      setMutating(true);
      try {
        if (customer) {
          const res = await cartApi.applyCoupon(code.trim());
          setCart(res.data);
          toast.success(`Coupon ${code.toUpperCase()} applied.`);
          return { ok: true };
        }

        // Validate via backend even for guest preview!
        const res = await catalogApi.validateCoupon(code.trim(), Number(cart.subtotal));
        const nextCoupon = {
          code: res.data.code,
          type: res.data.type,
          value: res.data.value,
          discount_amount: res.data.discount_amount,
        };
        setGuestCoupon(nextCoupon);
        setCart(buildGuestSummary(readGuestCart(), nextCoupon));
        toast.success(`Coupon ${res.data.code} applied.`);
        return { ok: true };
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Invalid coupon code.";
        toast.error(message);
        return { ok: false, error: message };
      } finally {
        setMutating(false);
      }
    },
    [cart.subtotal, customer],
  );

  const removeCoupon = useCallback(async () => {
    setMutating(true);
    try {
      if (customer) {
        const res = await cartApi.removeCoupon();
        setCart(res.data);
      } else {
        setGuestCoupon(null);
        setCart(buildGuestSummary(readGuestCart(), null));
      }
      toast.success("Coupon removed.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove coupon.");
    } finally {
      setMutating(false);
    }
  }, [customer]);

  const clearLocalAfterCheckout = useCallback(() => {
    clearGuestCart();
    setGuestCoupon(null);
    setCart(EMPTY_CART);
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        mutating,
        refreshCart,
        addToCart,
        updateQuantity,
        removeItem,
        applyCoupon,
        removeCoupon,
        clearLocalAfterCheckout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return ctx;
}
