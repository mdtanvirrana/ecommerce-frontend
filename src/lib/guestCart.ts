export interface GuestCartItem {
  product_id: number;
  name: string;
  slug: string;
  sku: string;
  image_url: string | null;
  unit_price: string;
  regular_price: string;
  discount_price: string | null;
  stock_quantity: number;
  quantity: number;
  selected_color: string | null;
  selected_size: string | null;
}

const STORAGE_KEY = "shopco_guest_cart_v1";

export function readGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeGuestCart(items: GuestCartItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }
}

export function clearGuestCart(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
