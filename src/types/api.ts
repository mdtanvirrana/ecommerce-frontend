export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  errors?: Record<string, string[]>;
}

export interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  products_count?: number;
  parent?: Category | null;
  children?: Category[];
  created_at?: string;
}

export interface ProductImage {
  id: number;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
}

export interface Product {
  id: number;
  category_id: number;
  category?: Category;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  regular_price: string;
  discount_price: string | null;
  effective_price: string;
  discount_percentage: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  in_stock: boolean;
  is_active: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_top_selling: boolean;
  rating: string;
  reviews_count: number;
  colors: string[];
  sizes: string[];
  primary_image_url: string | null;
  images?: ProductImage[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductDetailPayload {
  product: Product;
  related_products: Product[];
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  email_verified_at: string | null;
  is_email_verified?: boolean;
  orders_count?: number;
  total_spent?: string;
  created_at?: string;
}

export interface Permission {
  id: number;
  name: string;
  group: string;
  description: string | null;
}

export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  is_super_admin: boolean;
  permissions?: Permission[];
  staff_count?: number;
  created_at?: string;
}

export interface Staff {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  two_factor_enabled?: boolean;
  two_factor_confirmed_at?: string | null;
  roles?: Role[];
  permissions: string[];
  created_at?: string;
}

export interface CartItem {
  id: number;
  product_id: number;
  name: string;
  slug: string;
  sku: string;
  image_url: string | null;
  regular_price: string;
  discount_price: string | null;
  unit_price: string;
  quantity: number;
  line_total: string;
  stock_quantity: number;
  is_available: boolean;
  selected_color: string | null;
  selected_size: string | null;
}

export interface CartCoupon {
  id: number;
  code: string;
  type: "percentage" | "fixed";
  value: string;
}

export interface CartSummary {
  id: number;
  items: CartItem[];
  item_count: number;
  subtotal: string;
  discount_amount: string;
  shipping_amount: string;
  total_amount: string;
  coupon: CartCoupon | null;
  coupon_notice: string | null;
}

export interface Coupon {
  id: number;
  code: string;
  type: "percentage" | "fixed";
  value: string;
  minimum_order_amount: string;
  maximum_discount_amount: string | null;
  usage_limit: number | null;
  per_customer_usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  selected_color: string | null;
  selected_size: string | null;
  unit_price: string;
  quantity: number;
  line_total: string;
  image_url: string | null;
}

export interface Payment {
  id: number;
  provider: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  amount: string;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "cancelled" | "refunded";
  failure_code: string | null;
  failure_message: string | null;
  verified_at: string | null;
  refunded_at: string | null;
  created_at: string;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded"
  | "needs_resolution";

export interface Order {
  id: number;
  order_number: string;
  user_id: number;
  customer?: Customer;
  status: OrderStatus;
  allowed_transitions: OrderStatus[];
  is_cancellable: boolean;
  payment_status: PaymentStatus;
  coupon_code: string | null;
  subtotal: string;
  discount_amount: string;
  shipping_amount: string;
  total_amount: string;
  currency: string;
  shipping: {
    full_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postal_code: string;
    delivery_instructions: string | null;
  };
  items?: OrderItem[];
  items_count?: number;
  latest_payment?: Payment | null;
  payments?: Payment[];
  paid_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  stock_deducted_at: string | null;
  stock_restored_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckoutResponse {
  order: Order;
  payment: Payment;
  client_secret: string;
  publishable_key: string;
}

export interface Review {
  id: number;
  product_id: number;
  product?: {
    id: number;
    name: string;
    slug: string;
    sku: string;
  } | null;
  user_id: number | null;
  reviewer_name: string;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  is_featured: boolean;
  created_at: string;
}

export interface AdminReviewsPayload {
  reviews: Review[];
  summary: {
    total_reviews: number;
    approved_reviews: number;
    pending_reviews: number;
    featured_reviews: number;
    average_rating: string;
  };
}

export interface DashboardData {
  stats: {
    today_orders: number;
    today_revenue: string;
    total_customers: number;
    low_stock_products: number;
    total_orders: number;
    total_revenue: string;
  };
  sales_chart: Array<{
    date: string;
    label: string;
    orders: number;
    revenue: number;
  }>;
  recent_orders: Order[];
  low_stock_items: Array<{
    id: number;
    name: string;
    sku: string;
    stock_quantity: number;
    low_stock_threshold: number;
  }>;
}
