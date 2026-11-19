import { BACKEND_API_URL } from "@/lib/bff";
import type { ApiResponse, Category, Product, ProductDetailPayload } from "@/types/api";

async function serverFetchJson<T>(path: string): Promise<ApiResponse<T> | null> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/${path.replace(/^\//, "")}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return null;
  }
}

export const serverCatalog = {
  getProducts: (query = "") =>
    serverFetchJson<Product[]>(`products${query ? `?${query}` : ""}`),
  getProductBySlug: (slug: string) =>
    serverFetchJson<ProductDetailPayload>(`products/${encodeURIComponent(slug)}`),
  getCategories: () => serverFetchJson<Category[]>("categories"),
  getCategoryBySlug: (slug: string) =>
    serverFetchJson<Category>(`categories/${encodeURIComponent(slug)}`),
};
