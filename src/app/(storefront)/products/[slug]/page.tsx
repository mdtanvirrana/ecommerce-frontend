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
  const detail = await serverCatalog.getProductBySlug(slug);
  return <ProductDetailView slug={slug} initialDetail={detail} />;
}
