# System Architecture & Technical Walkthrough Guide

This document explains every core engineering and security decision in the Nocfinity E-Commerce Platform so each subsystem can be clearly explained during a live code walkthrough.

---

## 1. Strict Backend / Frontend Separation

- **Laravel 13 (`ecommerce-backend/`)** is the exclusive source of truth for authentication, RBAC authorization, catalog pricing, coupon eligibility, shipping calculation, inventory locking, order creation, and Stripe payment verification.
- **Next.js 16 (`ecommerce-frontend/`)** renders the `SHOP.CO` customer storefront and the staff admin panel, communicating with Laravel strictly over RESTful JSON endpoints (`/api/v1/*`).
- No Laravel Blade views are used for application pages (only a Markdown Mailable template for transactional emails).
- No monetary, coupon, stock, or authorization business logic is trusted from Next.js.

## 2. Laravel Architecture

The backend follows a clean layered structure:
- **Thin Controllers** (`app/Http/Controllers/Api/V1/`): Parse validated requests, call domain Services, return standardized `ApiResponse` JSON envelopes (`{success, message, data, meta}`).
- **Form Requests** (`app/Http/Requests/`): Centralize validation rules (strong passwords, unique SKUs, MIME/size checks on uploaded images, checkout shipping fields — deliberately omitting monetary fields).
- **API Resources** (`app/Http/Resources/`): Shape JSON output and guarantee sensitive attributes (`password`, `remember_token`, internal secrets) are never serialized.
- **Domain Services** (`app/Services/`): Encapsulate transactional business logic (`CartService`, `CouponService`, `ShippingCalculator`, `CheckoutService`, `PaymentService`, `InventoryService`, `OrderService`, `OrderNumberGenerator`, `StripeGateway`).
- **Enums** (`app/Enums/`): Type-safe `OrderStatus` (with `allowedTransitions()` state machine), `PaymentStatus`, `CouponType`, `UserType`, `InventoryTransactionType`.
- **Events, Listeners & Queued Mailables**: Decouple side-effect emails (`OrderConfirmed`, `PaymentSucceeded`, `OrderStatusUpdated`, `OrderCancelled`, `RefundProcessed`) from database transactions so emails dispatch cleanly after commit.

## 3. Authentication Strategy (Sanctum + Separate Guards + HttpOnly Cookies)

### Separate Customer & Staff Guards
- Both customers and staff reside in the `users` table (distinguished by `user_type` ENUM `'customer' | 'staff'`) so `role_user` directly satisfies the required relational schema.
- Two sibling Eloquent models extend `User`:
  - `App\Models\Customer` (global scope `user_type = 'customer'`)
  - `App\Models\Staff` (global scope `user_type = 'staff'`)
- In `config/auth.php`, two separate Sanctum guards are configured:
  - `customer` guard → `customers` provider (`App\Models\Customer`)
  - `admin` guard → `staff` provider (`App\Models\Staff`)
- Because Sanctum's `Guard::hasValidProvider()` verifies `$accessToken->tokenable instanceof $providerModel`, a `Customer` token is **automatically rejected (401)** by `auth:admin`, and a `Staff` token is **automatically rejected (401)** by `auth:customer`.
- Additionally, `EnsureActiveAccount` middleware enforces both `is_active === true` and matching token abilities (`customer` vs `staff`).
- Both login endpoints enforce **5-attempt rate limiting** via `RateLimiter` keyed on `email + IP`, returning generic `"Invalid credentials."` errors on failure to prevent account enumeration.

### Secure Browser Token Storage (Zero `localStorage` Tokens)
- Storing bearer tokens in `localStorage` exposes them to XSS attacks.
- Instead, Next.js uses thin BFF Route Handlers (`/api/auth/*`, `/api/admin-auth/*`, `/api/proxy/[...path]`) that store Sanctum tokens exclusively inside **`HttpOnly`, `SameSite=Lax`** cookies (`shop_customer_token` and `shop_admin_token`) and strip raw tokens from responses sent to browser JavaScript.
- Using two separate `HttpOnly` cookies also allows simultaneous testing of both Customer Storefront and Staff Admin in the same browser session without interference.

## 4. Database-Driven RBAC & Effective Permission Calculation

- Tables: `roles`, `permissions`, `role_user`, `permission_role`.
- Five seeded system roles (`Super Admin`, `Admin`, `Product Manager`, `Order Manager`, `Support`) and 30 granular permissions across 8 domains.
- **Effective Permission Calculation** (`HasRolesAndPermissions::effectivePermissions()`):
  1. If the staff user holds the `super-admin` role, they automatically receive every permission in `permissions`.
  2. Otherwise, Laravel computes the union of all `permissions.name` values across all roles assigned to the staff user (`role_user` → `roles` → `permission_role` → `permissions`).
- **Backend Enforcement**: Every admin route is protected by `CheckPermission` middleware (`permission:products.create`, `permission:orders.update_status`, etc.) — never hardcoded role-name checks alone.
- **Super Admin Protection**:
  - `AdminStaffController` rejects any attempt by non-Super Admins to modify or assign the Super Admin role, forbids deleting any Super Admin, forbids deactivating Super Admin, and prevents removing the last remaining Super Admin's privileges.
  - `AdminRoleController` forbids deleting or modifying permissions on the `super-admin` role.
- **Frontend Dynamic Visibility**: `AdminAuthProvider` exposes `hasPermission()` / `hasAnyPermission()` to hide unauthorized sidebar items, create/edit/delete buttons, and action controls — strictly as UX enhancement complementing backend enforcement.

## 5. Price, Coupon & Monetary Integrity

- All monetary columns use `DECIMAL(12,2)`.
- All server arithmetic uses `App\Support\Money` backed by PHP `bcmath` (zero floating-point operations).
- `CheckoutRequest` does not accept `subtotal`, `discount_amount`, `shipping_amount`, or `total_amount`. `CheckoutService` loads live `Product` records from MySQL, applies `Product::effectivePrice()`, validates coupons via `CouponService::validateAndCalculate()` (checking active status, start/expiry window, global usage limit, per-customer usage limit, minimum order, and maximum discount cap), calculates shipping via `ShippingCalculator`, and creates the order & Stripe `PaymentIntent` for exact cents (`Money::toCents()`).

## 6. Stripe Payment Verification & Webhook Idempotency

1. `POST /api/v1/checkout` creates a `pending` order and `pending` payment record (stock is **NOT** deducted yet) and creates a Stripe `PaymentIntent` with an idempotency key.
2. Next.js completes card confirmation via Stripe Elements (`stripe.confirmPayment`).
3. **Never trusting frontend success**, confirmation happens through either:
   - `POST /api/v1/stripe/webhook` (primary):
     - Verifies the cryptographic `Stripe-Signature` header via `Webhook::constructEvent` (rejects forged payloads with `400`).
     - Inserts a unique `webhook_events.event_id` record — duplicate Stripe deliveries hit the unique constraint and return an idempotent `200` without double processing.
   - `POST /api/v1/orders/{order}/confirm-payment` (delayed webhook reconciliation):
     - Fetches the `PaymentIntent` directly from Stripe's server-side API.
4. `PaymentService::confirmPaymentIntent()` ALWAYS calls `retrievePaymentIntent()` on Stripe's server API and checks:
   - `status === 'succeeded'`
   - `amount_received === Money::toCents($payment->amount)`
   - `currency === $payment->currency`
5. Only after verification does it transition the order to `paid` and decrement inventory. Failed/cancelled payments update `payment_status` without touching inventory.

## 7. Database Transactions, `lockForUpdate()`, and Overselling Prevention

Inside `PaymentService::confirmPaymentIntent()`:
1. Opens a `DB::transaction()`.
2. Locks the `Order` and `Payment` rows (`lockForUpdate()`) and exits early if `stock_deducted_at !== null` (double-confirm guard).
3. Calls `InventoryService::deductForOrder($order)`:
   - Aggregates quantities per `product_id` and **sorts `product_id` ascending** (`ksort()` + `ORDER BY id`) before issuing `SELECT ... FOR UPDATE` (`lockForUpdate()`). Consistent ascending lock ordering prevents MySQL deadlocks when two concurrent checkouts share multiple products in different cart orders.
   - Phase 1 validates `is_active` and `stock_quantity >= qtyNeeded` for **every** item before mutating any row.
   - Phase 2 decrements `stock_quantity`, inserts `InventoryTransaction` (`sale_deduction`), and stamps `order.stock_deducted_at`.
4. **Post-Payment Oversell Handling**: If two customers paid concurrently for the final item, the first transaction wins the row lock and drops stock `1 -> 0`; the second transaction sees `stock_quantity = 0` inside its lock, never allows negative stock, preserves the verified payment record, cancels the order, and automatically invokes `StripeGateway::createRefund()` (or flags `payment_status = needs_resolution` if Stripe refund fails).

## 8. Order Lifecycle & Single-Execution Cancellation Stock Restoration

- Valid state transitions are enforced inside `OrderStatus::canTransitionTo()`:
  `pending -> paid -> processing -> shipped -> delivered`, plus `cancelled` allowed from `pending | paid | processing`.
- Invalid jumps (e.g. `pending -> shipped`, `delivered -> cancelled`) return `409 Conflict`.
- `OrderService::cancel()` locks the `Order` row (`lockForUpdate()`) and invokes `InventoryService::restoreForOrder()`:
  - Restores stock **if and only if** `stock_deducted_at !== null && stock_restored_at === null`.
  - Locks product rows in ascending ID order, increments `stock_quantity`, logs `InventoryTransaction` (`cancellation_restoration`), and stamps `stock_restored_at`.
  - Guaranteeing stock restoration happens **strictly once** even under concurrent or repeated cancellation requests.

## 9. Customer Order Ownership & IDOR Prevention

- `OrderPolicy::view()` and `OrderPolicy::pay()` assert `(int) $order->user_id === (int) $customer->id`.
- `OrderController::index()` scopes strictly with `->where('user_id', $customer->id)`.
- `OrderController::show()`, `CheckoutController::retryPayment()`, and `CheckoutController::confirmPayment()` all authorize through `OrderPolicy`, returning `403 Forbidden` whenever a customer attempts to access another customer's order ID.
