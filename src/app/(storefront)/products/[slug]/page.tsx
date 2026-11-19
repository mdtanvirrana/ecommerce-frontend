import React from "react";
import { ProductDetailView } from "@/features/catalog/ProductDetailView";
import { serverCatalog } from "@/lib/serverCatalog";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [detail, initialReviews] = await Promise.all([
    serverCatalog.getProductBySlug(slug),
    serverCatalog.getProductReviews(slug, 6),
  ]);
  return (
    <ProductDetailView
      slug={slug}
      initialDetail={detail}
      initialReviews={initialReviews}
    />
  );
}
