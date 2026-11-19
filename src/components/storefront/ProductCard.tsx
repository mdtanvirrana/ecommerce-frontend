import React from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { StarRating } from "@/components/storefront/StarRating";
import type { Product } from "@/types/api";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl =
    product.primary_image_url ||
    product.images?.[0]?.url ||
    "/images/style-casual.jpg";

  const hasDiscount =
    product.discount_price !== null &&
    Number(product.discount_price) < Number(product.regular_price);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col focus:outline-none"
    >
      <div className="relative aspect-[295/298] w-full overflow-hidden rounded-[20px] bg-[#F0EEED]">
        <img
          src={imageUrl}
          alt={product.name}
          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {!product.in_stock && (
          <span className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-xs font-medium text-white">
            Out of Stock
          </span>
        )}
      </div>

      <h3 className="mt-3 sm:mt-4 truncate text-base sm:text-xl font-bold text-black group-hover:underline">
        {product.name}
      </h3>

      <div className="mt-1 sm:mt-2">
        <StarRating rating={product.rating} />
      </div>

      <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center gap-2 sm:gap-2.5">
        <span className="text-xl sm:text-2xl font-bold text-black">
          {formatMoney(product.effective_price)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-xl sm:text-2xl font-bold text-black/40 line-through">
              {formatMoney(product.regular_price)}
            </span>
            {product.discount_percentage && (
              <span className="rounded-full bg-[#FF3333]/10 px-3 py-1 text-[10px] sm:text-xs font-medium text-[#FF3333]">
                -{product.discount_percentage}%
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  );
}
