"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, CheckCircle2, Minus, MoreHorizontal, Plus, SlidersHorizontal } from "lucide-react";
import { catalogApi } from "@/services/api";
import { useCart } from "@/providers/CartProvider";
import { Breadcrumb } from "@/components/storefront/Breadcrumb";
import { ProductCard } from "@/components/storefront/ProductCard";
import { StarRating } from "@/components/storefront/StarRating";
import { Skeleton } from "@/components/ui/skeleton";
import { PRODUCT_FAQS, PRODUCT_REVIEWS } from "@/constants/storefront";
import { cn, formatMoney, getColorHex } from "@/lib/utils";
import type { ApiResponse, ProductDetailPayload } from "@/types/api";

export function ProductDetailView({
  slug,
  initialDetail,
}: {
  slug: string;
  initialDetail?: ApiResponse<ProductDetailPayload> | null;
}) {
  const { addToCart, mutating } = useCart();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["storefront-product", slug],
    queryFn: () => catalogApi.getProductBySlug(slug),
    initialData: initialDetail ?? undefined,
  });

  const product = data?.data?.product;
  const related = data?.data?.related_products ?? [];

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"details" | "reviews" | "faqs">("reviews");

  const resolvedColor =
    selectedColor && product?.colors?.includes(selectedColor)
      ? selectedColor
      : (product?.colors?.[0] ?? "");

  const resolvedSize =
    selectedSize && product?.sizes?.includes(selectedSize)
      ? selectedSize
      : product?.sizes?.includes("Large")
        ? "Large"
        : (product?.sizes?.[0] ?? "");

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-8 xl:px-0">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <Skeleton className="h-[480px] rounded-[20px] lg:col-span-6" />
          <div className="space-y-4 lg:col-span-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-14 w-full rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-16 text-center xl:px-0">
        <h1 className="font-display text-3xl">PRODUCT NOT FOUND</h1>
        <p className="mt-2 text-black/60">The item you are looking for may have been removed.</p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-black px-8 text-sm font-medium text-white"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  const gallery =
    product.images && product.images.length > 0
      ? product.images
      : [
          {
            id: 0,
            url: product.primary_image_url || "/images/style-casual.jpg",
            alt_text: product.name,
            is_primary: true,
            sort_order: 0,
          },
        ];

  const mainImage = gallery[activeImageIdx] ?? gallery[0];
  const hasDiscount =
    product.discount_price !== null &&
    Number(product.discount_price) < Number(product.regular_price);
  const maxQty = Math.max(1, product.stock_quantity);

  const handleAddToCart = async () => {
    await addToCart(product, quantity, resolvedColor || null, resolvedSize || null);
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-8 xl:px-0">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          ...(product.category?.parent
            ? [
                {
                  label: product.category.parent.name,
                  href: `/category/${product.category.parent.slug}`,
                },
              ]
            : []),
          ...(product.category
            ? [
                {
                  label: product.category.name,
                  href: `/category/${product.category.slug}`,
                },
              ]
            : []),
        ]}
      />

      {/* TOP PRODUCT SECTION — Exact Product Detail Page.jpg & (1).jpg Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Left Image Gallery: Desktop thumbnails left + large image right; Mobile large top + 3 thumbs bottom */}
        <div className="flex flex-col-reverse gap-3.5 sm:flex-row lg:col-span-6">
          <div className="grid grid-cols-3 gap-3 sm:flex sm:w-[152px] sm:shrink-0 sm:flex-col sm:gap-3.5">
            {gallery.slice(0, 4).map((img, idx) => (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setActiveImageIdx(idx)}
                className={cn(
                  "aspect-square sm:h-[167px] sm:w-[152px] overflow-hidden rounded-[20px] bg-[#F0EEED] border transition-colors cursor-pointer",
                  idx === activeImageIdx ? "border-black" : "border-transparent hover:border-black/30",
                )}
              >
                <img
                  src={img.url}
                  alt={img.alt_text || product.name}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden rounded-[20px] bg-[#F0EEED] aspect-[358/340] sm:aspect-auto sm:h-[530px]">
            <img
              src={mainImage.url}
              alt={mainImage.alt_text || product.name}
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>

        {/* Right Buy Box */}
        <div className="flex flex-col lg:col-span-6">
          <h1 className="font-display text-2xl sm:text-[40px] leading-[1.08] uppercase text-black">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StarRating rating={product.rating} size="md" />
            <span className="text-xs text-black/40">•</span>
            <span className="text-xs sm:text-sm font-medium text-black/60">
              SKU: <span className="text-black">{product.sku}</span>
            </span>
          </div>

          {/* Price Row */}
          <div className="mt-3.5 flex flex-wrap items-center gap-3">
            <span className="text-2xl sm:text-[32px] font-bold text-black">
              {formatMoney(product.effective_price)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-2xl sm:text-[32px] font-bold text-black/30 line-through">
                  {formatMoney(product.regular_price)}
                </span>
                {product.discount_percentage && (
                  <span className="rounded-full bg-[#FF3333]/10 px-3.5 py-1.5 text-sm font-medium text-[#FF3333]">
                    -{product.discount_percentage}%
                  </span>
                )}
              </>
            )}
          </div>

          {/* Stock Availability */}
          <div className="mt-3">
            {product.in_stock ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                In Stock ({product.stock_quantity} available)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3333]/10 px-3 py-1 text-xs font-medium text-[#FF3333]">
                <span className="h-2 w-2 rounded-full bg-[#FF3333]" />
                Out of Stock
              </span>
            )}
          </div>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-black/60">
            {product.description}
          </p>

          <hr className="my-5 border-black/10" />

          {/* Color Selector */}
          {product.colors && product.colors.length > 0 && (
            <>
              <div>
                <p className="text-sm sm:text-base text-black/60">Select Colors</p>
                <div className="mt-3 flex flex-wrap items-center gap-3.5">
                  {product.colors.map((color) => {
                    const active = resolvedColor === color;
                    const hex = getColorHex(color);
                    const isLight = color === "White" || color === "Yellow";
                    return (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        onClick={() => setSelectedColor(color)}
                        style={{ backgroundColor: hex }}
                        className={cn(
                          "flex h-[37px] w-[37px] items-center justify-center rounded-full border transition-transform hover:scale-105 cursor-pointer",
                          color === "White" ? "border-black/25" : "border-black/10",
                        )}
                      >
                        {active && (
                          <Check
                            className={cn(
                              "h-4 w-4 stroke-[3]",
                              isLight ? "text-black" : "text-white",
                            )}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <hr className="my-5 border-black/10" />
            </>
          )}

          {/* Size Selector */}
          {product.sizes && product.sizes.length > 0 && (
            <>
              <div>
                <p className="text-sm sm:text-base text-black/60">Choose Size</p>
                <div className="mt-3 flex flex-wrap gap-2.5 sm:gap-3">
                  {product.sizes.map((size) => {
                    const active = resolvedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          "rounded-full px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base transition-colors cursor-pointer",
                          active
                            ? "bg-black font-medium text-white"
                            : "bg-[#F0F0F0] text-black/60 hover:bg-black/10 hover:text-black",
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
              <hr className="my-5 border-black/10" />
            </>
          )}

          {/* Quantity Stepper + Add to Cart CTA */}
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="inline-flex h-[48px] sm:h-[52px] items-center justify-between rounded-full bg-[#F0F0F0] px-4 sm:px-5 w-[125px] sm:w-[170px] shrink-0">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity <= 1 || !product.in_stock}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-1 text-black disabled:opacity-40 cursor-pointer"
              >
                <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <span className="text-sm sm:text-base font-medium text-black">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={quantity >= maxQty || !product.in_stock}
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                className="p-1 text-black disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            <button
              type="button"
              disabled={!product.in_stock || mutating}
              onClick={handleAddToCart}
              className="h-[48px] sm:h-[52px] flex-1 rounded-full bg-black text-sm sm:text-base font-medium text-white transition-colors hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
            >
              {!product.in_stock
                ? "Out of Stock"
                : mutating
                  ? "Adding..."
                  : "Add to Cart"}
            </button>
          </div>
        </div>
      </div>

      {/* TABS SECTION — Product Details | Rating & Reviews | FAQs */}
      <div className="mt-12 sm:mt-16">
        <div className="grid grid-cols-3 border-b border-black/10 text-center">
          {(
            [
              { id: "details", label: "Product Details" },
              { id: "reviews", label: "Rating & Reviews" },
              { id: "faqs", label: "FAQs" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-4 text-sm sm:text-xl transition-colors cursor-pointer border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-black font-medium text-black"
                  : "border-transparent text-black/60 hover:text-black",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "details" && (
          <div className="mt-8 rounded-[20px] border border-black/10 p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-black">Specifications &amp; Care</h2>
            <p className="text-black/70 leading-relaxed">{product.description}</p>
            <dl className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3 border-t border-black/10 text-sm">
              <div>
                <dt className="text-black/50">SKU</dt>
                <dd className="mt-1 font-semibold text-black">{product.sku}</dd>
              </div>
              <div>
                <dt className="text-black/50">Category</dt>
                <dd className="mt-1 font-semibold text-black">
                  {product.category?.parent ? `${product.category.parent.name} / ` : ""}
                  {product.category?.name ?? "Apparel"}
                </dd>
              </div>
              <div>
                <dt className="text-black/50">Availability</dt>
                <dd className="mt-1 font-semibold text-black">
                  {product.in_stock ? `${product.stock_quantity} in stock` : "Out of Stock"}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="mt-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-black">All Reviews</h2>
                <span className="text-sm sm:text-base text-black/60">
                  ({product.reviews_count || PRODUCT_REVIEWS.length})
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F0F0F0]">
                  <SlidersHorizontal className="h-4 w-4 text-black" />
                </span>
                <span className="hidden sm:inline-flex h-10 items-center rounded-full bg-[#F0F0F0] px-5 text-sm font-medium">
                  Latest
                </span>
                <Link
                  href="/orders"
                  className="inline-flex h-10 items-center rounded-full bg-black px-5 text-xs sm:text-sm font-medium text-white hover:bg-black/85"
                >
                  Write a Review
                </Link>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              {PRODUCT_REVIEWS.map((rev) => (
                <article
                  key={rev.name}
                  className="rounded-[20px] border border-black/10 p-6 sm:px-8 sm:py-7"
                >
                  <div className="flex items-center justify-between">
                    <StarRating rating={rev.rating} showText={false} size="md" />
                    <MoreHorizontal className="h-5 w-5 text-black/40" />
                  </div>
                  <div className="mt-3.5 flex items-center gap-1.5">
                    <h3 className="text-base sm:text-xl font-bold text-black">{rev.name}</h3>
                    <CheckCircle2 className="h-5 w-5 fill-[#01AB31] text-white" />
                  </div>
                  <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-black/60">
                    &ldquo;{rev.quote}&rdquo;
                  </p>
                  <p className="mt-5 text-sm font-medium text-black/60">{rev.date}</p>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === "faqs" && (
          <div className="mt-8 space-y-4">
            {PRODUCT_FAQS.map((faq) => (
              <div key={faq.question} className="rounded-[20px] border border-black/10 p-6">
                <h3 className="text-base sm:text-lg font-bold text-black">{faq.question}</h3>
                <p className="mt-2 text-sm sm:text-base text-black/60">{faq.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* YOU MIGHT ALSO LIKE — 4 Related Products from Laravel */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-center text-[32px] sm:text-[48px] leading-tight text-black">
            YOU MIGHT ALSO LIKE
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
