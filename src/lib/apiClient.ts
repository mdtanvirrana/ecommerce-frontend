import type { ApiResponse } from "@/types/api";

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  isFormData?: boolean;
  directUrl?: string;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, params, isFormData = false, directUrl } = options;

  let url = directUrl ?? `/api/proxy/${path.replace(/^\//, "")}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.set(key, String(val));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      url += `${url.includes("?") ? "&" : "?"}${qs}`;
    }
  }

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    if (isFormData && body instanceof FormData) {
      requestBody = body;
    } else {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body: requestBody,
    credentials: "same-origin",
  });

  const payload = (await response.json().catch(() => ({
    success: false,
    message: "Unexpected response from server.",
    errors: {},
  }))) as ApiResponse<T>;

  if (!response.ok || payload.success === false) {
    throw new ApiError(
      payload.message || "Request failed.",
      response.status,
      payload.errors || {},
    );
  }

  return payload;
}
