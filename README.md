# SHOP.CO — Nocfinity Full-Stack E-Commerce Platform

A production-grade, headless full-stack e-commerce platform built with **Laravel 13 (REST API)**, **Next.js 16 (App Router + TypeScript)**, **MySQL 8**, **Laravel Sanctum**, **Database-Driven RBAC**, and **Stripe Test Mode** (PaymentIntents + Signature-Verified Webhooks).

---

## Project Overview

The application provides two cleanly separated interfaces backed by a single Laravel JSON API source of truth:

1. **Customer-Facing Storefront (`SHOP.CO`)**: Implemented directly from the local Figma screenshots (`figma/` — Desktop `1440px` and Mobile `390px`), featuring Homepage, Category/Shop Listing with multi-facet filters & server-side pagination, Product Detail with multi-image gallery & variant selection, persistent MySQL Cart (plus guest cart localStorage merge on login), Coupon application, Checkout with Stripe Elements, Order Confirmation, and Order History/Tracking.
2. **Staff-Facing Administration Panel (`/admin`)**: Built with Tailwind CSS, `shadcn/ui`, Lucide icons, and Recharts, featuring real-time DB dashboard analytics, 30-day sales chart, Products CRUD with multi-image upload & stock adjustment, 2-level Categories CRUD, Orders lifecycle & cancellation management, Coupons CRUD, Customers directory & order spending, Staff multi-role assignment, Database-Driven Roles & Permissions Matrix (with Super Admin protection), Staff Profile management, and Dark Mode.

---

## Technology Stack

- **Backend**: Laravel `^13.17`, PHP `8.4`, MySQL `8.0+`, Laravel Sanctum `^4.5` (separate `customer` & `admin` guards), Stripe PHP SDK `^23.0`, Eloquent ORM, Form Requests, API Resources, Policies, Events/Listeners/Queued Mailables, `bcmath` exact decimal math, Pest `^5.3`, Laravel Pint.
- **Frontend**: Next.js `16.4.6` (App Router, Turbopack, `proxy.ts`), React 19, TypeScript 5, Tailwind CSS 4, `shadcn/ui` (Radix UI primitives), Lucide icons, React Hook Form + Zod, TanStack Query, Recharts, Stripe.js & React Stripe.js, Sonner toasts.
- **Payments**: Stripe Test Mode (PaymentIntents + Stripe Elements + Webhook signature verification + server-side reconciliation).
- **Mail / Local Testing**: Mailpit / Mailhog (SMTP `127.0.0.1:1025`).

---

## Folder Structure

```text
assessment/
├── ecommerce-backend/          # Laravel 13 REST API (/api/v1/*)
│   ├── app/
│   │   ├── Enums/              # OrderStatus, PaymentStatus, CouponType, UserType, InventoryTransactionType
│   │   ├── Events/             # OrderConfirmed, PaymentSucceeded, OrderStatusUpdated, OrderCancelled, RefundProcessed
│   │   ├── Exceptions/         # DomainException
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/
│   │   │   ├── Middleware/     # CheckPermission, EnsureActiveAccount, SecurityHeadersMiddleware
│   │   │   ├── Requests/       # Form Request validation classes
│   │   │   └── Resources/      # Typed API Resource transformers
│   │   ├── Listeners/          # SendOrderEmailNotifications
│   │   ├── Mail/               # Queued order/payment/refund Mailables
│   │   ├── Models/             # User, Customer, Staff, Role, Permission, Product, Category, Cart, Order, Payment...
│   │   ├── Policies/           # OrderPolicy (IDOR protection)
│   │   ├── Services/           # CartService, CheckoutService, CouponService, InventoryService, OrderService, PaymentService, StripeGateway
│   │   └── Support/            # Money (bcmath), ApiResponse
│   ├── database/
│   │   ├── migrations/         # MySQL 8 migrations with DECIMAL, FKs, indexes
│   │   └── seeders/            # RbacSeeder, CatalogSeeder, DemoCommerceSeeder
│   └── tests/Feature/          # Pest test suites (Auth, RBAC, Catalog/Cart, Checkout/Stripe/Inventory)
├── ecommerce-frontend/         # Next.js 16 App Router (Storefront + Admin Panel)
│   ├── public/images/          # Extracted local Figma hero & dress-style assets
│   └── src/
│       ├── app/
│       │   ├── api/            # Thin BFF Route Handlers (HttpOnly cookie token storage + API proxy)
│       │   ├── (storefront)/   # Homepage, Shop, Category, Product Detail, Cart, Checkout, Orders, Auth
│       │   └── admin/          # Staff Login + Dashboard, Products, Categories, Orders, Coupons, Customers, Staff, Roles, Profile
│       ├── components/         # ui/ (shadcn), storefront/, admin/, shared/
│       ├── features/           # Feature modules (home, catalog, cart, checkout, orders)
│       ├── providers/          # AppProviders, CustomerAuthProvider, CartProvider, AdminAuthProvider
│       ├── services/           # Typed REST API calls
│       ├── schemas/            # Zod schemas
│       ├── types/              # TypeScript interfaces
│       └── proxy.ts            # Next.js 16 optimistic route protection
├── figma/                      # Local Figma reference screenshots (8 files)
├── ARCHITECTURE.md             # Deep architectural & interview walkthrough guide
├── API_DOCUMENTATION.md        # Complete REST API contract
├── DATABASE_DESIGN.md          # MySQL 8 schema & indexing specification
├── FIGMA_DESIGN_SPEC.md        # Visual measurements & screenshot mapping
├── PROJECT_PLAN.md             # Phased execution plan
└── ASSESSMENT_CHECKLIST.md     # Requirement verification checklist
```

---

## Requirements

- PHP `>= 8.3` with extensions: `pdo_mysql`, `bcmath`, `gd`, `mbstring`, `openssl`, `curl`
- Composer `>= 2.7`
- MySQL `8.0+`
- Node.js `>= 20` & npm `>= 10`
- Mailpit or Mailhog (optional local SMTP viewer)
- Stripe CLI (optional for local webhook forwarding)

---

## MySQL Configuration

Create the main and test databases in MySQL 8:

```sql
CREATE DATABASE IF NOT EXISTS nocfinity_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS nocfinity_ecommerce_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## Backend Setup (`ecommerce-backend/`)

```bash
cd ecommerce-backend
composer install
cp .env.example .env
php artisan key:generate
php artisan storage:link
```

Configure `ecommerce-backend/.env` with your local MySQL 8 credentials, Mailpit SMTP, and Stripe **Test Mode** keys:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nocfinity_ecommerce
DB_USERNAME=your_mysql_user
DB_PASSWORD=your_mysql_password

FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025

STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd
```

### Migrations & Seeders

```bash
php artisan migrate:fresh --seed
```

---

## Frontend Setup (`ecommerce-frontend/`)

```bash
cd ecommerce-frontend
npm install
cp .env.example .env.local
```

Configure `ecommerce-frontend/.env.local`:

```env
BACKEND_API_URL=http://127.0.0.1:8000/api/v1
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Running Both Applications

1. **Start Laravel API (port 8000)**:
   ```bash
   cd ecommerce-backend
   php artisan serve --host=127.0.0.1 --port=8000
   ```
2. **Start Queue Worker (for queued order/payment emails)**:
   ```bash
   cd ecommerce-backend
   php artisan queue:work
   ```
3. **Start Next.js Frontend (port 3000)**:
   ```bash
   cd ecommerce-frontend
   npm run dev
   ```
4. **Optional — Start Mailpit**:
   ```bash
   mailpit # SMTP on 127.0.0.1:1025, Web UI on http://localhost:8025
   ```

---

## Stripe Test Mode Setup & Test Cards

1. Retrieve your **Test Mode** publishable (`pk_test_...`) and secret (`sk_test_...`) keys from the Stripe Dashboard (Test Mode toggle ON).
2. Forward webhooks locally with Stripe CLI:
   ```bash
   stripe listen --forward-to http://127.0.0.1:8000/api/v1/stripe/webhook
   ```
3. Copy the signing secret (`whsec_...`) printed by Stripe CLI into `STRIPE_WEBHOOK_SECRET` in `ecommerce-backend/.env`.

### Standard Stripe Test Cards
| Scenario | Card Number | Expiry | CVC |
|---|---|---|---|
| Successful payment | `4242 4242 4242 4242` | Any future date | Any 3 digits |
| Card declined | `4000 0000 0000 0002` | Any future date | Any 3 digits |
| Insufficient funds | `4000 0000 0000 9995` | Any future date | Any 3 digits |
| 3D Secure authentication | `4000 0027 6000 3184` | Any future date | Any 3 digits |

---

## Demo Credentials (Seeded)

### Super Admin & Staff (`/admin/login`)
| Role | Email | Password |
|---|---|---|
| **Super Admin** | `superadmin@shopco.local` | `SuperAdmin@123!` |
| **Admin** | `admin@shopco.local` | `Admin@123!` |
| **Product Manager** | `products@shopco.local` | `Staff@123!` |
| **Order Manager** | `orders@shopco.local` | `Staff@123!` |
| **Support** | `support@shopco.local` | `Staff@123!` |

### Demo Customers (`/login`)
| Name | Email | Password |
|---|---|---|
| Sarah Miller | `customer@shopco.local` | `Customer@123!` |
| Alex Klein | `alex@example.com` | `Customer@123!` |
| James Lin | `james@example.com` | `Customer@123!` |

### Seeded Demo Coupons
- `WELCOME20` — 20% off (min order `$50`, max discount `$100`, active)
- `SAVE25` — `$25` fixed off (min order `$150`, active)
- `EXPIRED10` — 10% off (expired, for testing rejection)

---

## Running Automated Tests

```bash
cd ecommerce-backend
php artisan test
```

Frontend typecheck & production build:
```bash
cd ecommerce-frontend
npx tsc --noEmit && npm run build
```

---

## API & Architecture Documentation

- Complete REST API Reference: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- System Architecture & Interview Walkthrough: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Database Schema: [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)
- Figma Visual Design Spec: [FIGMA_DESIGN_SPEC.md](./FIGMA_DESIGN_SPEC.md)
- Assessment Verification Checklist: [ASSESSMENT_CHECKLIST.md](./ASSESSMENT_CHECKLIST.md)

---

## Known Limitations, Skipped Optional Features & Future Improvements

- **Skipped optional bonus features** (prioritized payment integrity, RBAC, and stock concurrency per Section 22): TOTP-based Admin 2FA, Docker Compose file, CSV report export endpoint.
- **Live Stripe Elements UI** requires valid `pk_test_...` / `sk_test_...` / `whsec_...` Test Mode keys configured in `.env` and `.env.local` (all server-side payment, webhook, refund, and oversell paths are fully tested via mocked `StripeGatewayInterface` in Pest).
- **Future Improvements**: Customer product review submission backed by a `reviews` table (verified buyers only), Redis-backed caching & Horizon queues, CSV/PDF report exports for `reports.export`, multi-currency support, and TOTP 2FA for staff accounts.
