"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { catalogApi } from "@/services/api";
import { Breadcrumb } from "@/components/storefront/Breadcrumb";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_COLORS, FILTER_SIZES } from "@/constants/storefront";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import type { ApiResponse, Category, Product } from "@/types/api";

interface CatalogListingViewProps {
  categorySlug?: string;
  initialProducts?: ApiResponse<Product[]> | null;
  initialCategories?: ApiResponse<Category[]> | null;
  initialCategory?: ApiResponse<Category> | null;
}

const SORT_OPTIONS: Record<string, string> = {
  popular: "Most Popular",
  newest: "Newest",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
};

export function CatalogListingView({
  categorySlug,
  initialProducts,
  initialCategories,
  initialCategory,
}: CatalogListingViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 767px)", false);
  const perPage = isMobile ? 6 : 9;

  const initialSearch = searchParams.get("search") ?? "";
  const initialMin = Number(searchParams.get("min_price") ?? 0);
  const initialMax = Number(searchParams.get("max_price") ?? 400);
  const initialColor = searchParams.get("color") ?? "";
  const initialSize = searchParams.get("size") ?? "";
  const initialSort = searchParams.get("sort") ?? "popular";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? 1));
  const onSale = searchParams.get("on_sale") === "1";
  const newArrivals = searchParams.get("new_arrivals") === "1";
  const topSelling = searchParams.get("top_selling") === "1";

  const [draftMin, setDraftMin] = useState(initialMin);
  const [draftMax, setDraftMax] = useState(initialMax);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [draftColor, setDraftColor] = useState(initialColor);
  const [draftSize, setDraftSize] = useState(initialSize);
  const [draftSearch, setDraftSearch] = useState(initialSearch);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [openSections, setOpenSections] = useState({
    price: true,
    colors: true,
    size: true,
    style: true,
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ["storefront-categories"],
    queryFn: () => catalogApi.getCategories(),
    initialData: initialCategories ?? undefined,
  });
  const categories = categoriesRes?.data ?? [];

  const { data: activeCategoryRes } = useQuery({
    queryKey: ["storefront-category", categorySlug],
    queryFn: () => catalogApi.getCategoryBySlug(categorySlug!),
    enabled: Boolean(categorySlug),
    initialData: initialCategory ?? undefined,
  });

  const activeCategory = activeCategoryRes?.data ?? null;

  const queryParams = useMemo(
    () => ({
      category: categorySlug || undefined,
      search: initialSearch || undefined,
      min_price: initialMin > 0 ? initialMin : undefined,
      max_price: initialMax < 400 ? initialMax : undefined,
      color: initialColor || undefined,
      size: initialSize || undefined,
      sort: initialSort,
      on_sale: onSale ? 1 : undefined,
      new_arrivals: newArrivals ? 1 : undefined,
      top_selling: topSelling ? 1 : undefined,
      page: initialPage,
      per_page: perPage,
    }),
    [
      categorySlug,
      initialSearch,
      initialMin,
      initialMax,
      initialColor,
      initialSize,
      initialSort,
      onSale,
      newArrivals,
      topSelling,
      initialPage,
      perPage,
    ],
  );

  const isDefaultView =
    !isMobile &&
    !initialSearch &&
    initialMin === 0 &&
    initialMax === 400 &&
    !initialColor &&
    !initialSize &&
    initialSort === "popular" &&
    initialPage === 1 &&
    !onSale &&
    !newArrivals &&
    !topSelling;

  const { data: productsRes, isLoading, isError } = useQuery({
    queryKey: ["storefront-products", queryParams],
    queryFn: () => catalogApi.getProducts(queryParams),
    initialData: isDefaultView && initialProducts ? initialProducts : undefined,
  });

  const products = (productsRes?.data ?? []).slice(0, perPage);
  const meta = productsRes?.meta;

  const pushQuery = (updates: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "" || v === 0) {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    }
    const base = categorySlug ? `/category/${categorySlug}` : "/shop";
    const qs = next.toString();
    router.push(qs ? `${base}?${qs}` : base);
  };

  const applyFilters = () => {
    if (draftMin < 0 || draftMax < 0) {
      setPriceError("Price values cannot be negative.");
      return;
    }
    if (draftMin > draftMax) {
      setPriceError("Minimum price cannot exceed maximum price.");
      return;
    }
    setPriceError(null);
    pushQuery({
      search: draftSearch.trim() || undefined,
      min_price: draftMin > 0 ? draftMin : undefined,
      max_price: draftMax < 400 ? draftMax : undefined,
      color: draftColor || undefined,
      size: draftSize || undefined,
      page: 1,
    });
    setMobileFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftMin(0);
    setDraftMax(400);
    setPriceError(null);
    setDraftColor("");
    setDraftSize("");
    setDraftSearch("");
    router.push(categorySlug ? `/category/${categorySlug}` : "/shop");
    setMobileFilterOpen(false);
  };

  // All subcategories flattened for the top list matching Category Page.jpg
  const subcategories = useMemo(() => {
    const list: Array<{ name: string; slug: string }> = [];
    for (const parent of categories) {
      for (const child of parent.children ?? []) {
        list.push({ name: child.name, slug: child.slug });
      }
    }
    return list.slice(0, 6);
  }, [categories]);

  const pageTitle = activeCategory
    ? activeCategory.name
    : onSale
      ? "On Sale"
      : newArrivals
        ? "New Arrivals"
        : topSelling
          ? "Top Selling"
          : initialSearch
            ? `Search: "${initialSearch}"`
            : "All Products";

  const showingFrom = meta && meta.total > 0 ? (meta.current_page - 1) * meta.per_page + 1 : 0;
  const showingTo = meta ? Math.min(meta.current_page * meta.per_page, meta.total) : 0;

  const filterPanelContent = (
    <div className="space-y-5">
      {/* Search inside filter panel */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
        <input
          type="text"
          value={draftSearch}
          onChange={(e) => setDraftSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          placeholder="Search products..."
          className="h-10 w-full rounded-full bg-[#F0F0F0] pl-10 pr-3 text-sm text-black placeholder:text-black/40 focus:outline-none"
        />
      </div>

      {/* Subcategories List */}
      <div className="space-y-3 border-b border-black/10 pb-5">
        {subcategories.map((sub) => (
          <Link
            key={sub.slug}
            href={`/category/${sub.slug}`}
            onClick={() => setMobileFilterOpen(false)}
            className={cn(
              "flex items-center justify-between text-base transition-colors",
              categorySlug === sub.slug
                ? "font-semibold text-black"
                : "text-black/60 hover:text-black",
            )}
          >
            <span>{sub.name}</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ))}
      </div>

      {/* Price Filter */}
      <div className="border-b border-black/10 pb-5">
        <button
          type="button"
          onClick={() => setOpenSections((s) => ({ ...s, price: !s.price }))}
          className="flex w-full items-center justify-between text-xl font-bold text-black cursor-pointer"
        >
          <span>Price</span>
          {openSections.price ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {openSections.price && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-black/60">Min ($)</label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={draftMin}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDraftMin(Number.isNaN(next) ? 0 : next);
                    setPriceError(null);
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-black/15 px-2.5 text-sm text-black"
                />
              </div>
              <div>
                <label className="text-xs text-black/60">Max ($)</label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={draftMax}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDraftMax(Number.isNaN(next) ? 0 : next);
                    setPriceError(null);
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-black/15 px-2.5 text-sm text-black"
                />
              </div>
            </div>
            {priceError && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {priceError}
              </p>
            )}
            <input
              type="range"
              min={0}
              max={400}
              step={10}
              value={Math.min(400, Math.max(0, draftMax))}
              onChange={(e) => {
                setDraftMax(Math.max(draftMin, Number(e.target.value)));
                setPriceError(null);
              }}
              className="w-full accent-black cursor-pointer"
            />
            <div className="flex justify-between text-sm font-medium text-black">
              <span>${draftMin}</span>
              <span>${draftMax}</span>
            </div>
          </div>
        )}
      </div>

      {/* Colors Filter */}
      <div className="border-b border-black/10 pb-5">
        <button
          type="button"
          onClick={() => setOpenSections((s) => ({ ...s, colors: !s.colors }))}
          className="flex w-full items-center justify-between text-xl font-bold text-black cursor-pointer"
        >
          <span>Colors</span>
          {openSections.colors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {openSections.colors && (
          <div className="mt-4 grid grid-cols-5 gap-3">
            {FILTER_COLORS.map((color) => {
              const selected = draftColor === color.name;
              const isLight = color.name === "White" || color.name === "Yellow";
              return (
                <button
                  key={color.name}
                  type="button"
                  title={color.name}
                  aria-label={`Filter by ${color.name}`}
                  onClick={() => setDraftColor(selected ? "" : color.name)}
                  style={{ backgroundColor: color.hex }}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border transition-transform hover:scale-105 cursor-pointer",
                    color.name === "White" ? "border-black/20" : "border-black/10",
                  )}
                >
                  {selected && (
                    <Check
                      className={cn("h-4 w-4 stroke-[3]", isLight ? "text-black" : "text-white")}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Size Filter */}
      <div className="border-b border-black/10 pb-5">
        <button
          type="button"
          onClick={() => setOpenSections((s) => ({ ...s, size: !s.size }))}
          className="flex w-full items-center justify-between text-xl font-bold text-black cursor-pointer"
        >
          <span>Size</span>
          {openSections.size ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {openSections.size && (
          <div className="mt-4 flex flex-wrap gap-2">
            {FILTER_SIZES.map((sz) => {
              const selected = draftSize === sz;
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setDraftSize(selected ? "" : sz)}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs sm:text-sm transition-colors cursor-pointer",
                    selected
                      ? "bg-black font-medium text-white"
                      : "bg-[#F0F0F0] text-black/60 hover:bg-black/10 hover:text-black",
                  )}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Dress Style Filter */}
      <div className="pb-2">
        <button
          type="button"
          onClick={() => setOpenSections((s) => ({ ...s, style: !s.style }))}
          className="flex w-full items-center justify-between text-xl font-bold text-black cursor-pointer"
        >
          <span>Dress Style</span>
          {openSections.style ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {openSections.style && (
          <div className="mt-4 space-y-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                onClick={() => setMobileFilterOpen(false)}
                className={cn(
                  "flex items-center justify-between text-base",
                  categorySlug === cat.slug
                    ? "font-semibold text-black"
                    : "text-black/60 hover:text-black",
                )}
              >
                <span>{cat.name}</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={applyFilters}
          className="h-12 w-full rounded-full bg-black text-sm font-medium text-white hover:bg-black/85 cursor-pointer"
        >
          Apply Filter
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="h-10 w-full rounded-full border border-black/15 text-xs font-medium text-black/70 hover:bg-[#F0F0F0] cursor-pointer"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-8 xl:px-0">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          ...(activeCategory?.parent
            ? [{ label: activeCategory.parent.name, href: `/category/${activeCategory.parent.slug}` }]
            : []),
          { label: pageTitle },
        ]}
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Desktop Left Filter Sidebar (295px) */}
        <aside className="hidden lg:block w-[295px] shrink-0 rounded-[20px] border border-black/10 px-6 py-5">
          <div className="mb-5 flex items-center justify-between border-b border-black/10 pb-5">
            <h2 className="text-xl font-bold text-black">Filters</h2>
            <SlidersHorizontal className="h-5 w-5 text-black/40" />
          </div>
          {filterPanelContent}
        </aside>

        {/* Right Product Grid Column */}
        <div className="flex-1 min-w-0">
          {/* Header Bar matching Category Page.jpg / .png */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h1 className="text-2xl sm:text-[32px] font-bold text-black">{pageTitle}</h1>
              {meta && (
                <span className="text-xs sm:text-base text-black/60 lg:hidden">
                  Showing {showingFrom}-{showingTo} of {meta.total} Products
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {meta && (
                <span className="hidden lg:inline text-base text-black/60">
                  Showing {showingFrom}-{showingTo} of {meta.total} Products
                </span>
              )}

              <div className="hidden sm:flex items-center gap-1.5 text-sm">
                <span className="text-black/60">Sort by:</span>
                <Select
                  value={initialSort}
                  items={SORT_OPTIONS}
                  onValueChange={(value) => {
                    if (value) pushQuery({ sort: value, page: 1 });
                  }}
                >
                  <SelectTrigger
                    aria-label="Sort products"
                    className="h-9 min-w-[168px] rounded-full border-black/15 bg-white font-medium text-black"
                  >
                    <SelectValue>{SORT_OPTIONS[initialSort] ?? "Most Popular"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="end">
                    {Object.entries(SORT_OPTIONS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                aria-label="Open filters"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F0F0] text-black lg:hidden cursor-pointer"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Mobile Sort Row using shadcn Select */}
          <div className="mt-3 flex items-center justify-between sm:hidden">
            <span className="text-xs text-black/60">Sort by:</span>
            <Select
              value={initialSort}
              items={SORT_OPTIONS}
              onValueChange={(value) => {
                if (value) pushQuery({ sort: value, page: 1 });
              }}
            >
              <SelectTrigger
                size="sm"
                aria-label="Sort products mobile"
                className="min-w-[160px] rounded-full border-transparent bg-[#F0F0F0] px-3 text-xs font-medium text-black"
              >
                <SelectValue>{SORT_OPTIONS[initialSort] ?? "Most Popular"}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {Object.entries(SORT_OPTIONS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Grid — 6 per page on mobile, 9 per page on desktop */}
          <div className="mt-5 sm:mt-6">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3">
                {Array.from({ length: perPage }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[295/298] w-full rounded-[20px]" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-[20px] border border-black/10 p-10 text-center">
                <p className="text-base font-medium text-black">
                  Could not load products right now.
                </p>
                <p className="mt-1 text-sm text-black/60">
                  Please check that the Laravel backend server is running.
                </p>
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-[20px] border border-black/10 p-12 text-center">
                <p className="text-lg font-bold text-black">No products match your filters</p>
                <p className="mt-1 text-sm text-black/60">
                  Try widening your price range or clearing selected filters.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3.5 gap-y-6 sm:gap-5 md:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination Bar matching Category Page.jpg */}
          {meta && meta.last_page > 1 && (
            <>
              <hr className="my-8 border-black/10" />
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={meta.current_page <= 1}
                  onClick={() => pushQuery({ page: meta.current_page - 1 })}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/10 px-3.5 text-xs sm:text-sm font-medium text-black disabled:opacity-40 hover:bg-[#F0F0F0] cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: meta.last_page }).map((_, idx) => {
                    const p = idx + 1;
                    const active = p === meta.current_page;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => pushQuery({ page: p })}
                        className={cn(
                          "h-9 w-9 sm:h-10 sm:w-10 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer",
                          active
                            ? "bg-black/6 text-black"
                            : "text-black/50 hover:bg-black/5 hover:text-black",
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => pushQuery({ page: meta.current_page + 1 })}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/10 px-3.5 text-xs sm:text-sm font-medium text-black disabled:opacity-40 hover:bg-[#F0F0F0] cursor-pointer"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Sheet Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 lg:hidden">
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-[20px] bg-white px-5 py-6">
            <div className="mb-5 flex items-center justify-between border-b border-black/10 pb-4">
              <h2 className="text-xl font-bold text-black">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
                className="p-1 text-black/60 hover:text-black cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterPanelContent}
          </div>
        </div>
      )}
    </div>
  );
}
