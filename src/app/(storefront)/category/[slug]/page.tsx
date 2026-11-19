import React, { Suspense } from "react";
import { CatalogListingView } from "@/features/catalog/CatalogListingView";
import { serverCatalog } from "@/lib/serverCatalog";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [products, categories, activeCategory] = await Promise.all([
    serverCatalog.getProducts(`category=${encodeURIComponent(slug)}&sort=popular&per_page=9&page=1`),
    serverCatalog.getCategories(),
    serverCatalog.getCategoryBySlug(slug),
  ]);

  return (
    <Suspense fallback={<div className="mx-auto max-w-[1240px] px-4 py-12">Loading category...</div>}>
      <CatalogListingView
        categorySlug={slug}
        initialProducts={products}
        initialCategories={categories}
        initialCategory={activeCategory}
      />
    </Suspense>
  );
}
