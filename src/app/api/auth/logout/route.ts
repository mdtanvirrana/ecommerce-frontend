import { NextResponse } from "next/server";
import {
  BACKEND_API_URL,
  clearAuthCookie,
  CUSTOMER_COOKIE,
  getTokenCookie,
} from "@/lib/bff";

export async function POST() {
  const token = await getTokenCookie(CUSTOMER_COOKIE);

  if (token) {
    await fetch(`${BACKEND_API_URL}/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }).catch(() => null);
  }

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully.",
    data: null,
  });
  clearAuthCookie(response, CUSTOMER_COOKIE);
  return response;
}
