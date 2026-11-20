import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  BACKEND_API_URL,
  clearAuthCookie,
  CUSTOMER_COOKIE,
  getTokenCookie,
} from "@/lib/bff";

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const joinedPath = path.join("/");
  const isAdminPath = path[0] === "admin";
  const cookieName = isAdminPath ? ADMIN_COOKIE : CUSTOMER_COOKIE;
  const token = await getTokenCookie(cookieName);

  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_API_URL}/${joinedPath}${search}`;

  const headers = new Headers();
  headers.set("Accept", "application/json");

  const incomingContentType = request.headers.get("content-type");
  if (incomingContentType && !incomingContentType.includes("multipart/form-data")) {
    headers.set("Content-Type", incomingContentType);
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    if (incomingContentType?.includes("multipart/form-data")) {
      body = await request.formData();
    } else {
      body = await request.text();
    }
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    const text = await upstream.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = {
        success: false,
        message: "Unexpected response from backend API.",
        errors: {},
      };
    }

    const response = NextResponse.json(payload, { status: upstream.status });

    const upstreamCacheControl = upstream.headers.get("cache-control");
    if (
      request.method === "GET" &&
      !isAdminPath &&
      !token &&
      upstream.ok &&
      upstreamCacheControl?.includes("public")
    ) {
      response.headers.set("Cache-Control", upstreamCacheControl);
    } else {
      response.headers.set("Cache-Control", "no-store");
    }

    if (upstream.status === 401 && (joinedPath === "me" || joinedPath === "admin/me")) {
      clearAuthCookie(response, cookieName);
    }

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to reach backend API server.",
        errors: {},
      },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
