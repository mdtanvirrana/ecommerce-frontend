# Figma Design Specification — SHOP.CO Storefront

All design specs are extracted directly from the 8 local screenshots in `figma/`. No external Figma URL was used.

## 1. Screenshots Inspected & Page Mapping

| File | Viewport | Page |
|---|---|---|
| `figma/Homepage.jpg` | `1440 × 4370px` | Storefront Homepage (Desktop) |
| `figma/Homepage (1).jpg` | `390 × 4461px` | Storefront Homepage (Mobile) |
| `figma/Category Page.jpg` | `1440 × 2332px` | Category / Product Listing Page (Desktop) |
| `figma/Category Page.png` | `390 × 2140px` | Category / Product Listing Page (Mobile) |
| `figma/Product Detail Page.jpg` | `1440 × 3066px` | Product Detail Page (Desktop) |
| `figma/Product Detail Page (1).jpg` | `390 × 3553px` | Product Detail Page (Mobile) |
| `figma/Cart.jpg` | `1440 × 1453px` | Shopping Cart Page (Desktop) |
| `figma/Cart (1).jpg` | `390 × 2033px` | Shopping Cart Page (Mobile) |

## 2. Design Tokens (Colors, Typography, Radii, Layout)

### Color Palette
- **Primary Black / CTA / Bars**: `#000000`
- **Primary Text**: `#000000`
- **Secondary / Muted Text**: `rgba(0, 0, 0, 0.60)` (`#666666`)
- **Subtle Placeholder / Strikethrough**: `rgba(0, 0, 0, 0.40)` (`#999999`)
- **Page Background**: `#FFFFFF`
- **Hero Section Background**: `#F2F0F1`
- **Product Card Image Surface**: `#F0EEED`
- **Section Surface (Dress Style, Footer, Inputs, Pills)**: `#F0F0F0`
- **Borders & Dividers**: `rgba(0, 0, 0, 0.10)`
- **Discount Badge Background**: `rgba(255, 51, 51, 0.10)`
- **Discount Text / Delete Icon Red**: `#FF3333`
- **Star Rating Gold**: `#FFC633`
- **Verified Check Green**: `#01AB31`

### Typography
- **Display Headings & Brand Wordmark (`SHOP.CO`)**: Heavy geometric uppercase sans — `Archivo Black` (closest Google Font match to Integral CF), tight tracking (`-0.02em`), tight line-height (`1.0`–`1.05`).
  - Hero H1: `64px` desktop / `36px` mobile
  - Section H2 (`NEW ARRIVALS`, `TOP SELLING`, `BROWSE BY DRESS STYLE`, `OUR HAPPY CUSTOMERS`, `YOU MIGHT ALSO LIKE`): `48px` desktop / `32px` mobile
  - Product Detail / Cart H1: `40px` desktop / `24px`–`32px` mobile
  - Newsletter Banner H2: `40px` desktop / `32px` mobile
  - Brand Wordmark: `32px` desktop / `25px` mobile
- **Body & UI Copy**: `Plus Jakarta Sans` / `DM Sans` (closest match to Satoshi).
  - Body text: `16px` desktop / `14px` mobile
  - Product Card Title: `20px` bold desktop / `16px` bold mobile
  - Product Card Price: `24px` bold desktop / `20px` bold mobile
  - Discount Pill: `12px` medium (`rounded-full px-3.5 py-1.5`)

### Container & Spacing
- Desktop max container width: `1240px` (`100px` side padding on `1440px` viewport).
- Mobile horizontal padding: `16px` (`358px` content width on `390px` viewport).
- Border Radii:
  - Pills / Buttons / Inputs / Search bar: `9999px` (`rounded-full`)
  - Product Image Cards / Review Cards / Filter Sidebar / Cart Boxes / Newsletter Card: `20px`
  - Dress Style Outer Container: `40px` desktop / `20px` mobile

## 3. Page-by-Page Layout Specifications

### Global Header & Footer
1. **Announcement Bar**: `38px` desktop (`34px` mobile), `#000000`, centered white text `Sign up and get 20% off to your first order. Sign Up Now` (links to `/register`), dismissible `×` on desktop right.
2. **Navbar**: `96px` desktop (`64px` mobile), `#FFFFFF`, sticky top, subtle bottom border on inner pages.
   - Desktop: `SHOP.CO` | Nav links (`Shop ▾`, `On Sale`, `New Arrivals`, `Brands`) | Pill Search input (`bg-[#F0F0F0] rounded-full flex-1`) | Cart icon (with live item count badge) + Account icon (dropdown/link to Login / Orders / Admin).
   - Mobile: Hamburger menu icon (opens mobile drawer) + `SHOP.CO` left | Search toggle icon + Cart icon + Account icon right.
3. **Newsletter Banner + Footer**:
   - Overlapping `#000000` rounded-`[20px]` card straddling the top edge of `#F0F0F0` footer (`-mb-[90px]` overlap).
   - Footer (`#F0F0F0`, `pt-[140px]` desktop / `pt-[190px]` mobile): 5-column desktop grid (Brand + 4 link groups: `COMPANY`, `HELP`, `FAQ`, `RESOURCES`), 2×2 link grid on mobile; bottom divider + copyright + payment method badges (`VISA`, `Mastercard`, `PayPal`, `Apple Pay`, `G Pay`).

### Homepage (`/` — `Homepage.jpg` & `Homepage (1).jpg`)
1. **Hero (`#F2F0F1`, `663px` min-height desktop)**: 2-column split on desktop (left: H1, subtitle, black `Shop Now` pill, 3-column metrics with vertical dividers; right: full-height fashion couple photo cropped from `Homepage.jpg` with 2 four-point black sparkles). Stacked vertically on mobile (`390px`) with 2+1 centered metrics grid.
2. **Brand Strip (`#000000`, `122px` desktop / `146px` mobile)**: `VERSACE`, `ZARA`, `GUCCI`, `PRADA`, `Calvin Klein` wordmarks.
3. **New Arrivals**: Centered display H2, 4-column desktop grid (horizontal scroll / 2-column mobile), `View All` outlined pill button (`w-[218px]` desktop, full-width mobile), subtle bottom divider.
4. **Top Selling**: Centered display H2, 4-column desktop grid, `View All` outlined pill button.
5. **Browse by Dress Style**: `#F0F0F0` `rounded-[40px]` box with centered display H2 and asymmetric 12-column bento grid: Row 1 (`Casual` 5 cols, `Formal` 7 cols), Row 2 (`Party` 7 cols, `Gym` 5 cols), each `h-[289px] rounded-[20px] bg-white overflow-hidden` with bold top-left label and cropped dress-style photo from `Homepage.jpg`. Mobile: 4 stacked `h-[190px]` cards.
6. **Our Happy Customers**: Left-aligned display H2 + prev/next arrow controls, 3-card desktop carousel (1-card mobile) with 5 gold stars, reviewer name + green verified icon, and quote.

### Category / Shop Listing (`/shop` & `/category/[slug]` — `Category Page.jpg` & `Category Page.png`)
- Breadcrumb (`Home > Casual`)
- Desktop: Left `295px` bordered filter card (`Filters`, subcategories list, dual Price range slider, 10 color circles, 9 size pills, Dress Style parent links, black `Apply Filter` button) + Right fluid column (Title, `Showing X–Y of Z Products`, `Sort by:` select, 3-column product grid, divider, `← Previous` / numbered pages / `Next →` pagination).
- Mobile: Filter icon button opens slide-up/drawer filter sheet; 2-column product grid.

### Product Detail (`/products/[slug]` — `Product Detail Page.jpg` & `Product Detail Page (1).jpg`)
- Breadcrumb (`Home > Shop > {Parent} > {Category}`)
- Gallery: Desktop = left column of 3 square thumbnails (`152×167px`, active black border) + main `#F0EEED` image (`444×530px`); Mobile = main image on top + 3 horizontal thumbnails below.
- Buy Box: Uppercase display title, stars + rating, price + strikethrough + red discount pill, SKU & stock badge, description, `Select Colors` circular swatches, `Choose Size` pills, divider, quantity pill (`- 1 +`) + black `Add to Cart` pill.
- 3 Tabs (`Product Details`, `Rating & Reviews`, `FAQs`) with active bottom black bar; `Rating & Reviews` shows 2-column verified review cards on desktop (1-column mobile).
- `YOU MIGHT ALSO LIKE` 4-column related products grid.

### Cart (`/cart` — `Cart.jpg` & `Cart (1).jpg`)
- Breadcrumb (`Home > Cart`), display heading `YOUR CART`.
- Desktop: 12-column split (7 cols cart items bordered card + 5 cols `Order Summary` bordered card); Mobile: stacked vertically.
- Cart item row: `124×124px` `#F0EEED` image, title, Size/Color/SKU lines, red trash remove button, bold price, `#F0F0F0` quantity stepper pill.
- Order Summary: `Subtotal`, `Discount` (red when applied + remove chip), `Delivery Fee`, divider, `Total`, promo input pill (`Add promo code`) + black `Apply` pill, full-width black `Go to Checkout →` button.

## 4. Missing Visual Reference Pages (Consistent System)
Pages without dedicated Figma screenshots (`Checkout`, `Order Confirmation`, `Order History / Tracking`, `Login / Register / Password Reset`) strictly reuse the `SHOP.CO` storefront design language (`#FFFFFF` canvas, `rounded-[20px]` `border-black/10` cards, `#F0F0F0` inputs, `#000000` rounded-full CTAs, `Archivo Black` display headings, `Plus Jakarta Sans` body). The **Admin Panel** uses a clean, high-density `shadcn/ui` + Tailwind dashboard design with Recharts visualizations and optional dark mode.
