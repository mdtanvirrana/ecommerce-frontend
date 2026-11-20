import { apiRequest } from "@/lib/apiClient";
import type {
  AdminReviewsPayload,
  CartSummary,
  Category,
  CheckoutResponse,
  Coupon,
  Customer,
  DashboardData,
  Order,
  OrderStatus,
  PaymentStatus,
  Permission,
  Product,
  ProductDetailPayload,
  Review,
  Role,
  Staff,
} from "@/types/api";

// ============ Public Catalog & Reviews ============
export const catalogApi = {
  getProducts: (params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest<Product[]>("products", { params }),

  getProductBySlug: (slug: string) =>
    apiRequest<ProductDetailPayload>(`products/${encodeURIComponent(slug)}`),

  getProductReviews: (
    slug: string,
    params?: { page?: number; per_page?: number; sort?: string },
  ) =>
    apiRequest<Review[]>(`products/${encodeURIComponent(slug)}/reviews`, {
      params,
    }),

  submitProductReview: (slug: string, payload: { rating: number; comment: string }) =>
    apiRequest<Review>(`products/${encodeURIComponent(slug)}/reviews`, {
      method: "POST",
      body: payload,
    }),

  getFeaturedReviews: () => apiRequest<Review[]>("reviews/featured"),

  getCategories: () => apiRequest<Category[]>("categories"),

  getCategoryBySlug: (slug: string) =>
    apiRequest<Category>(`categories/${encodeURIComponent(slug)}`),

  validateCoupon: (code: string, subtotal?: number) =>
    apiRequest<{
      code: string;
      type: "percentage" | "fixed";
      value: string;
      subtotal: string;
      discount_amount: string;
      final_subtotal: string;
    }>("coupons/validate", {
      method: "POST",
      body: { code, subtotal },
    }),
};

// ============ Customer Auth ============
export const customerAuthApi = {
  register: (payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    password_confirmation: string;
  }) =>
    apiRequest<{ user: Customer }>("", {
      method: "POST",
      directUrl: "/api/auth/register",
      body: payload,
    }),

  login: (payload: { email: string; password: string }) =>
    apiRequest<{ user: Customer }>("", {
      method: "POST",
      directUrl: "/api/auth/login",
      body: payload,
    }),

  logout: () =>
    apiRequest<null>("", {
      method: "POST",
      directUrl: "/api/auth/logout",
    }),

  me: () => apiRequest<Customer>("me"),

  updateProfile: (payload: { name: string; email?: string; phone?: string }) =>
    apiRequest<Customer>("me", { method: "PATCH", body: payload }),

  forgotPassword: (email: string) =>
    apiRequest<null>("password/forgot", { method: "POST", body: { email } }),

  resetPassword: (payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => apiRequest<null>("password/reset", { method: "POST", body: payload }),

  verifyEmail: (params: { id: string; hash: string; expires: string; signature: string }) =>
    apiRequest<Customer>(`email/verify/${encodeURIComponent(params.id)}/${encodeURIComponent(params.hash)}`, {
      params: { expires: params.expires, signature: params.signature },
    }),

  resendVerificationEmail: () =>
    apiRequest<Customer | null>("email/verification-notification", { method: "POST" }),
};

// ============ Customer Cart & Checkout & Orders ============
export const cartApi = {
  getCart: () => apiRequest<CartSummary>("cart"),

  addItem: (payload: {
    product_id: number;
    quantity: number;
    selected_color?: string | null;
    selected_size?: string | null;
  }) => apiRequest<CartSummary>("cart/items", { method: "POST", body: payload }),

  updateItem: (id: number, quantity: number) =>
    apiRequest<CartSummary>(`cart/items/${id}`, {
      method: "PATCH",
      body: { quantity },
    }),

  removeItem: (id: number) =>
    apiRequest<CartSummary>(`cart/items/${id}`, { method: "DELETE" }),

  mergeGuestCart: (
    items: Array<{
      product_id: number;
      quantity: number;
      selected_color?: string | null;
      selected_size?: string | null;
    }>,
  ) => apiRequest<CartSummary>("cart/merge", { method: "POST", body: { items } }),

  applyCoupon: (code: string) =>
    apiRequest<CartSummary>("cart/coupon", { method: "POST", body: { code } }),

  removeCoupon: () =>
    apiRequest<CartSummary>("cart/coupon", { method: "DELETE" }),
};

export const checkoutApi = {
  checkout: (payload: {
    shipping_full_name: string;
    shipping_email: string;
    shipping_phone: string;
    shipping_address: string;
    shipping_city: string;
    shipping_postal_code: string;
    delivery_instructions?: string;
    coupon_code?: string;
  }) => apiRequest<CheckoutResponse>("checkout", { method: "POST", body: payload }),

  validateStock: (orderId: number) =>
    apiRequest<{ order_id: number; stock_available: boolean }>(
      `orders/${orderId}/validate-stock`,
      { method: "POST" },
    ),

  retryPayment: (orderId: number) =>
    apiRequest<CheckoutResponse>(`orders/${orderId}/retry-payment`, {
      method: "POST",
    }),

  confirmPayment: (orderId: number) =>
    apiRequest<Order>(`orders/${orderId}/confirm-payment`, {
      method: "POST",
    }),

  getOrders: (page = 1) =>
    apiRequest<Order[]>("orders", { params: { page, per_page: 10 } }),

  getOrder: (id: number | string) => apiRequest<Order>(`orders/${id}`),
};

// ============ Admin Auth ============
export const adminAuthApi = {
  login: (payload: { email: string; password: string }) =>
    apiRequest<{
      requires_two_factor?: boolean;
      two_factor_token?: string;
      staff?: Staff;
    }>("", {
      method: "POST",
      directUrl: "/api/admin-auth/login",
      body: payload,
    }),

  verifyTwoFactorChallenge: (payload: { two_factor_token: string; code: string }) =>
    apiRequest<{ staff: Staff; used_recovery_code?: boolean }>("", {
      method: "POST",
      directUrl: "/api/admin-auth/two-factor",
      body: payload,
    }),

  logout: () =>
    apiRequest<null>("", {
      method: "POST",
      directUrl: "/api/admin-auth/logout",
    }),

  me: () => apiRequest<Staff>("admin/me"),

  updateProfile: (payload: { name: string; email: string; phone?: string }) =>
    apiRequest<Staff>("admin/profile", { method: "PATCH", body: payload }),

  updatePassword: (payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => apiRequest<null>("admin/profile/password", { method: "PUT", body: payload }),

  setupTwoFactor: () =>
    apiRequest<{ secret: string; issuer: string; otpauth_url: string }>("admin/two-factor/setup", {
      method: "POST",
    }),

  confirmTwoFactor: (code: string) =>
    apiRequest<{ two_factor_enabled: boolean; recovery_codes: string[]; staff: Staff }>(
      "admin/two-factor/confirm",
      { method: "POST", body: { code } },
    ),

  disableTwoFactor: (password: string) =>
    apiRequest<{ two_factor_enabled: boolean; staff: Staff }>("admin/two-factor/disable", {
      method: "POST",
      body: { password },
    }),

  regenerateRecoveryCodes: (password: string) =>
    apiRequest<{ recovery_codes: string[] }>("admin/two-factor/recovery-codes", {
      method: "POST",
      body: { password },
    }),

  forgotPassword: (email: string) =>
    apiRequest<null>("admin/password/forgot", { method: "POST", body: { email } }),

  resetPassword: (payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => apiRequest<null>("admin/password/reset", { method: "POST", body: payload }),
};

// ============ Admin Modules ============
export const adminApi = {
  getDashboard: () => apiRequest<DashboardData>("admin/dashboard"),

  // Products
  getProducts: (params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest<Product[]>("admin/products", { params }),

  getProduct: (id: number) => apiRequest<Product>(`admin/products/${id}`),

  createProduct: (formData: FormData) =>
    apiRequest<Product>("admin/products", {
      method: "POST",
      body: formData,
      isFormData: true,
    }),

  updateProduct: (id: number, formData: FormData) =>
    apiRequest<Product>(`admin/products/${id}`, {
      method: "POST",
      body: formData,
      isFormData: true,
    }),

  updateStock: (id: number, stock_quantity: number, notes?: string) =>
    apiRequest<Product>(`admin/products/${id}/stock`, {
      method: "PATCH",
      body: { stock_quantity, notes },
    }),

  deleteProductImage: (productId: number, imageId: number) =>
    apiRequest<Product>(`admin/products/${productId}/images/${imageId}`, {
      method: "DELETE",
    }),

  deleteProduct: (id: number) =>
    apiRequest<null>(`admin/products/${id}`, { method: "DELETE" }),

  // Categories (FormData supported for category image uploads)
  getCategories: (flat = false) =>
    apiRequest<Category[]>("admin/categories", { params: { flat: flat ? 1 : undefined } }),

  createCategory: (payload: FormData | Record<string, unknown>) =>
    apiRequest<Category>("admin/categories", {
      method: "POST",
      body: payload,
      isFormData: payload instanceof FormData,
    }),

  updateCategory: (id: number, payload: FormData | Record<string, unknown>) =>
    apiRequest<Category>(`admin/categories/${id}`, {
      method: payload instanceof FormData ? "POST" : "PUT",
      body: payload,
      isFormData: payload instanceof FormData,
    }),

  deleteCategory: (id: number) =>
    apiRequest<null>(`admin/categories/${id}`, { method: "DELETE" }),

  // Reviews & Ratings Moderation
  getReviews: (params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest<AdminReviewsPayload>("admin/reviews", { params }),

  updateReview: (
    id: number,
    payload: Partial<{
      rating: number;
      comment: string;
      is_approved: boolean;
      is_featured: boolean;
      is_verified_purchase: boolean;
    }>,
  ) => apiRequest<Review>(`admin/reviews/${id}`, { method: "PATCH", body: payload }),

  deleteReview: (id: number) =>
    apiRequest<null>(`admin/reviews/${id}`, { method: "DELETE" }),

  // Orders
  getOrders: (params?: Record<string, string | number | undefined>) =>
    apiRequest<Order[]>("admin/orders", { params }),

  getOrder: (id: number | string) => apiRequest<Order>(`admin/orders/${id}`),

  updateOrderStatus: (id: number, status: OrderStatus, reason?: string) =>
    apiRequest<Order>(`admin/orders/${id}/status`, {
      method: "PATCH",
      body: { status, reason },
    }),

  updateOrderPaymentStatus: (id: number, payment_status: PaymentStatus, note?: string) =>
    apiRequest<Order>(`admin/orders/${id}/payment-status`, {
      method: "PATCH",
      body: { payment_status, note },
    }),

  cancelOrder: (id: number, reason?: string) =>
    apiRequest<Order>(`admin/orders/${id}/cancel`, {
      method: "POST",
      body: { reason },
    }),

  // Coupons
  getCoupons: (params?: Record<string, string | number | undefined>) =>
    apiRequest<Coupon[]>("admin/coupons", { params }),

  createCoupon: (payload: Record<string, unknown>) =>
    apiRequest<Coupon>("admin/coupons", { method: "POST", body: payload }),

  updateCoupon: (id: number, payload: Record<string, unknown>) =>
    apiRequest<Coupon>(`admin/coupons/${id}`, { method: "PUT", body: payload }),

  deleteCoupon: (id: number) =>
    apiRequest<null>(`admin/coupons/${id}`, { method: "DELETE" }),

  // Customers
  getCustomers: (params?: Record<string, string | number | undefined>) =>
    apiRequest<Customer[]>("admin/customers", { params }),

  getCustomer: (id: number | string) =>
    apiRequest<{
      customer: Customer;
      total_orders: number;
      total_spending: string;
      orders: Order[];
    }>(`admin/customers/${id}`),

  // Staff
  getStaff: (params?: Record<string, string | number | undefined>) =>
    apiRequest<Staff[]>("admin/staff", { params }),

  createStaff: (payload: Record<string, unknown>) =>
    apiRequest<Staff>("admin/staff", { method: "POST", body: payload }),

  updateStaff: (id: number, payload: Record<string, unknown>) =>
    apiRequest<Staff>(`admin/staff/${id}`, { method: "PUT", body: payload }),

  deleteStaff: (id: number) =>
    apiRequest<null>(`admin/staff/${id}`, { method: "DELETE" }),

  // Roles & Permissions
  getRoles: () => apiRequest<Role[]>("admin/roles"),
  getPermissions: () => apiRequest<Permission[]>("admin/permissions"),

  createRole: (payload: { name: string; description?: string; permission_ids: number[] }) =>
    apiRequest<Role>("admin/roles", { method: "POST", body: payload }),

  updateRole: (id: number, payload: { name?: string; description?: string; permission_ids?: number[] }) =>
    apiRequest<Role>(`admin/roles/${id}`, { method: "PUT", body: payload }),

  syncRolePermissions: (id: number, permission_ids: number[]) =>
    apiRequest<Role>(`admin/roles/${id}/permissions`, {
      method: "PUT",
      body: { permission_ids },
    }),

  deleteRole: (id: number) =>
    apiRequest<null>(`admin/roles/${id}`, { method: "DELETE" }),
};
