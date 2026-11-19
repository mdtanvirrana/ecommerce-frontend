import React, { Suspense } from "react";
import { CatalogListingView } from "@/features/catalog/CatalogListingView";
import { serverCatalog } from "@/lib/serverCatalog";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [products, categories] = await Promise.all([
    serverCatalog.getProducts("sort=popular&per_page=9&page=1"),
    serverCatalog.getCategories(),
  ]);

  return (
    <Suspense fallback={<div className="mx-auto max-w-[1240px] px-4 py-12">Loading catalog...</div>}>
      <CatalogListingView initialProducts={products} initialCategories={categories} />
    </Suspense>
  );
}
