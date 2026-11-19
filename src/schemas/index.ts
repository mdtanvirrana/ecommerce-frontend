import { z } from "zod";

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Must include at least one uppercase letter.")
  .regex(/[a-z]/, "Must include at least one lowercase letter.")
  .regex(/[0-9]/, "Must include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Must include at least one special symbol.");

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Full name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    phone: z.string().optional(),
    password: strongPassword,
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match.",
    path: ["password_confirmation"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email("Please enter a valid email address."),
    token: z.string().min(1, "Reset token is required."),
    password: strongPassword,
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match.",
    path: ["password_confirmation"],
  });

export const checkoutSchema = z.object({
  shipping_full_name: z.string().min(2, "Full name is required."),
  shipping_email: z.string().email("Valid email address is required."),
  shipping_phone: z.string().min(6, "Valid phone number is required."),
  shipping_address: z.string().min(5, "Shipping address is required."),
  shipping_city: z.string().min(2, "City is required."),
  shipping_postal_code: z.string().min(2, "Postal code is required."),
  delivery_instructions: z.string().max(1000).optional(),
});

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Valid email is required."),
  phone: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required."),
    password: strongPassword,
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match.",
    path: ["password_confirmation"],
  });

export const productFormSchema = z
  .object({
    name: z.string().trim().min(2, "Product name must be at least 2 characters."),
    slug: z.string().optional(),
    sku: z.string().trim().min(2, "SKU is required."),
    category_id: z.coerce.number({ message: "Please select a category." }).min(1, "Please select a category."),
    description: z.string().optional(),
    regular_price: z.coerce
      .number({ message: "Enter a valid regular price." })
      .min(0.01, "Regular price must be greater than $0.00."),
    discount_price: z
      .union([z.literal(""), z.coerce.number({ message: "Enter a valid discount price." }).min(0.01, "Discount price must be greater than $0.00.")])
      .optional()
      .transform((v) => (v === "" ? null : v ?? null)),
    stock_quantity: z.coerce
      .number({ message: "Enter a valid stock quantity." })
      .int("Stock must be a whole number.")
      .min(0, "Stock cannot be negative."),
    low_stock_threshold: z.coerce
      .number({ message: "Enter a valid threshold." })
      .int("Threshold must be a whole number.")
      .min(0, "Threshold cannot be negative.")
      .default(5),
    colors: z.string().optional(),
    sizes: z.string().optional(),
    is_active: z.boolean().default(true),
    is_featured: z.boolean().default(false),
    is_new_arrival: z.boolean().default(false),
    is_top_selling: z.boolean().default(false),
  })
  .refine(
    (data) => data.discount_price === null || data.discount_price < data.regular_price,
    {
      message: "Discount price must be lower than regular price.",
      path: ["discount_price"],
    },
  );

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters."),
  slug: z.string().optional(),
  parent_id: z
    .union([z.literal(""), z.literal("none"), z.coerce.number()])
    .optional()
    .transform((v) => (v === "" || v === "none" || v === undefined ? null : Number(v))),
  description: z.string().optional(),
  sort_order: z.coerce
    .number({ message: "Enter a valid sort order." })
    .int("Sort order must be a whole number.")
    .min(0, "Sort order cannot be negative.")
    .default(0),
  is_active: z.boolean().default(true),
});

export const couponFormSchema = z
  .object({
    code: z.string().trim().min(2, "Coupon code must be at least 2 characters."),
    type: z.enum(["percentage", "fixed"]),
    value: z.coerce
      .number({ message: "Enter a valid discount value." })
      .min(0.01, "Discount value must be greater than 0."),
    minimum_order_amount: z.coerce
      .number({ message: "Enter a valid minimum order amount." })
      .min(0, "Minimum order amount cannot be negative.")
      .default(0),
    maximum_discount_amount: z
      .union([z.literal(""), z.coerce.number({ message: "Enter a valid amount." }).min(0.01, "Must be greater than 0.")])
      .optional()
      .transform((v) => (v === "" ? null : v ?? null)),
    usage_limit: z
      .union([z.literal(""), z.coerce.number({ message: "Enter a whole number." }).int().min(1, "Must be at least 1.")])
      .optional()
      .transform((v) => (v === "" ? null : v ?? null)),
    per_customer_usage_limit: z
      .union([z.literal(""), z.coerce.number({ message: "Enter a whole number." }).int().min(1, "Must be at least 1.")])
      .optional()
      .transform((v) => (v === "" ? null : v ?? null)),
    starts_at: z.string().optional(),
    expires_at: z.string().optional(),
    is_active: z.boolean().default(true),
  })
  .refine((data) => data.type !== "percentage" || data.value <= 100, {
    message: "Percentage discount cannot exceed 100%.",
    path: ["value"],
  })
  .refine(
    (data) =>
      !data.starts_at ||
      !data.expires_at ||
      new Date(data.expires_at).getTime() > new Date(data.starts_at).getTime(),
    {
      message: "Expiration date must be after start date.",
      path: ["expires_at"],
    },
  );

export const staffFormSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Valid email is required."),
  phone: z.string().optional(),
  password: z.string().optional(),
  is_active: z.boolean().default(true),
  role_ids: z.array(z.number()).min(1, "Assign at least one role."),
});

export const roleFormSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters."),
  description: z.string().max(500, "Description must be under 500 characters.").optional(),
  permission_ids: z.array(z.number()).default([]),
});

export const reviewFormSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(1, "Please select a rating from 1 to 5 stars.")
    .max(5, "Rating cannot exceed 5 stars."),
  comment: z
    .string()
    .trim()
    .min(10, "Review must be at least 10 characters long.")
    .max(2000, "Review cannot exceed 2000 characters."),
});

export const adminReviewFormSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(1, "Rating must be between 1 and 5.")
    .max(5, "Rating must be between 1 and 5."),
  comment: z
    .string()
    .trim()
    .min(5, "Comment must be at least 5 characters.")
    .max(2000, "Comment cannot exceed 2000 characters."),
  is_approved: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export const stockAdjustSchema = z.object({
  stock_quantity: z.coerce
    .number({ message: "Enter a valid stock number." })
    .int("Stock must be a whole number.")
    .min(0, "Stock cannot be negative."),
  low_stock_threshold: z.coerce
    .number({ message: "Enter a valid threshold." })
    .int("Threshold must be a whole number.")
    .min(0, "Threshold cannot be negative."),
});

export const newsletterSchema = z.object({
  email: z.string().trim().min(1, "Email address is required.").email("Please enter a valid email address."),
});

export const couponApplySchema = z.object({
  code: z.string().trim().min(2, "Please enter a promo code."),
});
