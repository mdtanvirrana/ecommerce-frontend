import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  BACKEND_API_URL,
  clearAuthCookie,
  getTokenCookie,
} from "@/lib/bff";

export async function POST() {
  const token = await getTokenCookie(ADMIN_COOKIE);

  if (token) {
    await fetch(`${BACKEND_API_URL}/admin/logout`, {
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
    message: "Staff logged out successfully.",
    data: null,
  });
  clearAuthCookie(response, ADMIN_COOKIE);
  return response;
}
