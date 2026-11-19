import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, BACKEND_API_URL, setAuthCookie } from "@/lib/bff";

export async function POST(request: NextRequest) {
  const body = await request.text();

  const upstream = await fetch(`${BACKEND_API_URL}/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  const payload = await upstream.json().catch(() => ({
    success: false,
    message: "Admin authentication service unavailable.",
    errors: {},
  }));

  if (!upstream.ok || !payload?.data?.token) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  const token = String(payload.data.token);
  const sanitized = {
    ...payload,
    data: {
      staff: payload.data.staff,
    },
  };

  const response = NextResponse.json(sanitized, { status: upstream.status });
  setAuthCookie(response, ADMIN_COOKIE, token);
  return response;
}
