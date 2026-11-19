import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CUSTOMER_COOKIE = "shop_customer_token";
const ADMIN_COOKIE = "shop_admin_token";

const ADMIN_PUBLIC_PATHS = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
];

const CUSTOMER_PROTECTED_PATHS = ["/account", "/orders", "/checkout"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const isPublicAdmin = ADMIN_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    const hasAdminCookie = Boolean(request.cookies.get(ADMIN_COOKIE)?.value);

    if (!isPublicAdmin && !hasAdminCookie) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname === "/admin/login" && hasAdminCookie) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    return NextResponse.next();
  }

  const isCustomerProtected = CUSTOMER_PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isCustomerProtected) {
    const hasCustomerCookie = Boolean(request.cookies.get(CUSTOMER_COOKIE)?.value);
    if (!hasCustomerCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/orders/:path*", "/checkout/:path*"],
};
