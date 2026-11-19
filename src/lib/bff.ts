import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const BACKEND_API_URL = (
  process.env.BACKEND_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

export const CUSTOMER_COOKIE = "shop_customer_token";
export const ADMIN_COOKIE = "shop_admin_token";

export function setAuthCookie(
  response: NextResponse,
  cookieName: string,
  token: string,
): void {
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours (matches SANCTUM_EXPIRATION)
  });
}

export function clearAuthCookie(response: NextResponse, cookieName: string): void {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getTokenCookie(cookieName: string): Promise<string | null> {
  const store = await cookies();
  return store.get(cookieName)?.value ?? null;
}
