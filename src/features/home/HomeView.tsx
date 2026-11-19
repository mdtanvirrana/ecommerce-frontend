"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { catalogApi } from "@/services/api";
import { ProductCard } from "@/components/storefront/ProductCard";
import { StarRating } from "@/components/storefront/StarRating";
import { Skeleton } from "@/components/ui/skeleton";
import { DRESS_STYLE_CARDS, HAPPY_CUSTOMERS } from "@/constants/storefront";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import type { ApiResponse, Category, Product, Review } from "@/types/api";

interface HomeViewProps {
  initialNewArrivals?: ApiResponse<Product[]> | null;
  initialTopSelling?: ApiResponse<Product[]> | null;
  initialCategories?: ApiResponse<Category[]> | null;
  initialFeaturedReviews?: ApiResponse<Review[]> | null;
}

const BENTO_SPANS = ["md:col-span-5", "md:col-span-7", "md:col-span-7", "md:col-span-5"];

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[295/298] w-full rounded-[20px]" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function HomeView({
  initialNewArrivals,
  initialTopSelling,
  initialCategories,
  initialFeaturedReviews,
}: HomeViewProps = {}) {
  const isDesktop = useMediaQuery("(min-width: 768px)", true);
  const slidesPerView = isDesktop ? 3 : 1;

  const [reviewIndex, setReviewIndex] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);

  const { data: newArrivalsRes, isLoading: loadingNew } = useQuery({
    queryKey: ["home-new-arrivals"],
    queryFn: () => catalogApi.getProducts({ new_arrivals: 1, per_page: 4 }),
    initialData: initialNewArrivals ?? undefined,
  });

  const { data: topSellingRes, isLoading: loadingTop } = useQuery({
    queryKey: ["home-top-selling"],
    queryFn: () => catalogApi.getProducts({ top_selling: 1, per_page: 4 }),
    initialData: initialTopSelling ?? undefined,
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ["storefront-categories"],
    queryFn: () => catalogApi.getCategories(),
    initialData: initialCategories ?? undefined,
  });

  const { data: featuredReviewsRes } = useQuery({
    queryKey: ["home-featured-reviews"],
    queryFn: () => catalogApi.getFeaturedReviews(),
    initialData: initialFeaturedReviews ?? undefined,
  });

  const newArrivals = newArrivalsRes?.data ?? [];
  const topSelling = topSellingRes?.data ?? [];

  // Build Browse by Dress Style cards dynamically from Admin Categories (using uploaded image_url when present)
  const dressStyleCards = useMemo(() => {
    const apiCategories = (categoriesRes?.data ?? []).filter((cat) => cat.is_active !== false);
    if (apiCategories.length === 0) {
      return DRESS_STYLE_CARDS;
    }

    const fallbackBySlug = new Map<string, string>(
      DRESS_STYLE_CARDS.map((card) => [card.slug, card.image]),
    );

    return apiCategories.slice(0, 6).map((cat, idx) => ({
      name: cat.name,
      slug: cat.slug,
      image: cat.image_url || fallbackBySlug.get(cat.slug) || "/images/style-casual.jpg",
      desktopColSpan: BENTO_SPANS[idx % BENTO_SPANS.length],
    }));
  }, [categoriesRes?.data]);

  // Dynamic featured reviews from MySQL with fallback
  const testimonials = useMemo(() => {
    const apiReviews = featuredReviewsRes?.data ?? [];
    if (apiReviews.length > 0) {
      return apiReviews.map((rev) => ({
        id: String(rev.id),
        name: rev.reviewer_name,
        rating: rev.rating,
        quote: rev.comment,
        verified: rev.is_verified_purchase,
      }));
    }
    return HAPPY_CUSTOMERS.map((rev, idx) => ({
      id: `fallback-${idx}`,
      name: rev.name,
      rating: rev.rating,
      quote: rev.quote,
      verified: true,
    }));
  }, [featuredReviewsRes?.data]);

  const maxSlideIndex = Math.max(0, testimonials.length - slidesPerView);
  const clampedIndex = Math.min(reviewIndex, maxSlideIndex);

  const handlePrevReview = () => {
    setReviewIndex((prev) => {
      const current = Math.min(prev, maxSlideIndex);
      return current <= 0 ? maxSlideIndex : current - 1;
    });
  };

  const handleNextReview = () => {
    setReviewIndex((prev) => {
      const current = Math.min(prev, maxSlideIndex);
      return current >= maxSlideIndex ? 0 : current + 1;
    });
  };

  // Auto-advance every 3000ms (3 seconds), pausing on hover/focus
  useEffect(() => {
    if (carouselPaused || maxSlideIndex <= 0) return;

    const timer = window.setInterval(() => {
      setReviewIndex((prev) => {
        const current = Math.min(prev, maxSlideIndex);
        return current >= maxSlideIndex ? 0 : current + 1;
      });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [carouselPaused, maxSlideIndex]);

  const slideOffsetPercent = (clampedIndex * 100) / slidesPerView;

  return (
    <div className="w-full overflow-x-hidden">
      {/* HERO SECTION — Exact #F2F0F1 Figma Layout */}
      <section className="bg-[#F2F0F1]">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 lg:grid-cols-12 items-center px-4 xl:px-0">
          {/* Hero Copy Column */}
          <div className="pt-10 pb-6 lg:col-span-6 lg:py-24">
            <h1 className="font-display text-[36px] leading-[0.98] sm:text-[52px] lg:text-[64px] text-black">
              FIND CLOTHES THAT MATCHES YOUR STYLE
            </h1>
            <p className="mt-5 max-w-[545px] text-sm sm:text-base leading-relaxed text-black/60">
              Browse through our diverse range of meticulously crafted garments, designed
              to bring out your individuality and cater to your sense of style.
            </p>
            <div className="mt-6 sm:mt-8">
              <Link
                href="/shop"
                className="inline-flex h-[52px] w-full sm:w-[210px] items-center justify-center rounded-full bg-black text-base font-medium text-white transition-colors hover:bg-black/85"
              >
                Shop Now
              </Link>
            </div>

            {/* Stats Row — 2+1 on mobile, 3 single-line with vertical dividers on desktop */}
            <div className="mt-8 sm:mt-12 flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-start gap-y-4">
              <div className="pr-6 xl:pr-8 border-r border-black/10 shrink-0">
                <p className="text-2xl sm:text-[32px] xl:text-[38px] font-bold leading-tight text-black whitespace-nowrap">
                  200+
                </p>
                <p className="text-xs sm:text-sm xl:text-base text-black/60 whitespace-nowrap">
                  International Brands
                </p>
              </div>
              <div className="pl-6 sm:px-6 xl:px-8 sm:border-r border-black/10 shrink-0">
                <p className="text-2xl sm:text-[32px] xl:text-[38px] font-bold leading-tight text-black whitespace-nowrap">
                  2,000+
                </p>
                <p className="text-xs sm:text-sm xl:text-base text-black/60 whitespace-nowrap">
                  High-Quality Products
                </p>
              </div>
              <div className="w-full sm:w-auto text-center sm:text-left sm:pl-6 xl:pl-8 shrink-0">
                <p className="text-2xl sm:text-[32px] xl:text-[38px] font-bold leading-tight text-black whitespace-nowrap">
                  30,000+
                </p>
                <p className="text-xs sm:text-sm xl:text-base text-black/60 whitespace-nowrap">
                  Happy Customers
                </p>
              </div>
            </div>
          </div>

          {/* Hero Visual Column (actual Figma hero photography) */}
          <div className="relative lg:col-span-6 lg:self-end">
            <img
              src="/images/hero-models.jpg"
              alt="Shop.co fashion models"
              className="hidden sm:block ml-auto h-[520px] lg:h-[663px] w-full object-cover object-top"
            />
            <img
              src="/images/hero-models-mobile.jpg"
              alt="Shop.co fashion models"
              className="block sm:hidden -mx-4 w-[calc(100%+2rem)] max-w-none object-cover"
            />
          </div>
        </div>
      </section>

      {/* BRAND STRIP — Solid #000000 bar */}
      <section className="bg-black py-8 sm:py-10">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-around lg:justify-between gap-x-8 gap-y-5 px-4 xl:px-0 text-white">
          <span className="font-serif text-2xl sm:text-[34px] tracking-[0.14em] uppercase">
            VERSACE
          </span>
          <span className="font-serif text-2xl sm:text-[36px] tracking-[-0.04em] font-semibold">
            ZARA
          </span>
          <span className="font-serif text-2xl sm:text-[34px] tracking-[0.12em] uppercase">
            GUCCI
          </span>
          <span className="font-serif text-2xl sm:text-[34px] font-bold tracking-[0.18em] uppercase">
            PRADA
          </span>
          <span className="font-sans text-2xl sm:text-[32px] font-light tracking-tight">
            Calvin Klein
          </span>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="mx-auto max-w-[1240px] px-4 py-12 sm:py-[72px] xl:px-0">
        <h2 className="font-display text-center text-[32px] sm:text-[48px] leading-tight text-black">
          NEW ARRIVALS
        </h2>

        <div className="mt-8 sm:mt-14">
          {loadingNew ? (
            <ProductGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 sm:mt-9 text-center">
          <Link
            href="/shop?new_arrivals=1"
            className="inline-flex h-[46px] sm:h-[52px] w-full sm:w-[218px] items-center justify-center rounded-full border border-black/10 text-sm sm:text-base font-medium text-black transition-colors hover:bg-black hover:text-white"
          >
            View All
          </Link>
        </div>

        <hr className="mt-12 sm:mt-16 border-black/10" />
      </section>

      {/* TOP SELLING */}
      <section className="mx-auto max-w-[1240px] px-4 pb-12 sm:pb-20 xl:px-0">
        <h2 className="font-display text-center text-[32px] sm:text-[48px] leading-tight text-black">
          TOP SELLING
        </h2>

        <div className="mt-8 sm:mt-14">
          {loadingTop ? (
            <ProductGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {topSelling.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 sm:mt-9 text-center">
          <Link
            href="/shop?top_selling=1"
            className="inline-flex h-[46px] sm:h-[52px] w-full sm:w-[218px] items-center justify-center rounded-full border border-black/10 text-sm sm:text-base font-medium text-black transition-colors hover:bg-black hover:text-white"
          >
            View All
          </Link>
        </div>
      </section>

      {/* BROWSE BY DRESS STYLE — Dynamic Categories from Admin + Exact Figma Bento Grid */}
      <section className="mx-auto max-w-[1240px] px-4 xl:px-0">
        <div className="rounded-[20px] sm:rounded-[40px] bg-[#F0F0F0] px-6 py-10 sm:px-16 sm:py-[70px]">
          <h2 className="font-display text-center text-[32px] leading-[1.1] sm:text-[48px] text-black">
            BROWSE BY DRESS STYLE
          </h2>

          <div className="mt-7 sm:mt-16 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-12">
            {dressStyleCards.map((card) => (
              <Link
                key={card.slug}
                href={`/category/${card.slug}`}
                className={`group relative h-[190px] sm:h-[289px] overflow-hidden rounded-[20px] bg-white ${card.desktopColSpan}`}
              >
                <img
                  src={card.image}
                  alt={card.name}
                  className="h-full w-full object-cover object-right transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute left-6 top-4 sm:left-9 sm:top-6 text-2xl sm:text-[36px] font-bold text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)]">
                  {card.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* OUR HAPPY CUSTOMERS — Smooth Animated Carousel (1 card on mobile, 3 on desktop, 3s auto-slide) */}
      <section
        className="mx-auto max-w-[1240px] px-4 pt-12 sm:pt-20 pb-4 xl:px-0"
        onMouseEnter={() => setCarouselPaused(true)}
        onMouseLeave={() => setCarouselPaused(false)}
        onFocusCapture={() => setCarouselPaused(true)}
        onBlurCapture={() => setCarouselPaused(false)}
      >
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-[32px] leading-[1.1] sm:text-[48px] text-black">
            OUR HAPPY CUSTOMERS
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrevReview}
              aria-label="Previous testimonials"
              className="rounded-full p-2.5 text-black transition-colors hover:bg-[#F0F0F0] cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              type="button"
              onClick={handleNextReview}
              aria-label="Next testimonials"
              className="rounded-full p-2.5 text-black transition-colors hover:bg-[#F0F0F0] cursor-pointer"
            >
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>

        <div className="mt-6 sm:mt-10 overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out will-change-transform md:-mx-2.5"
            style={{ transform: `translateX(-${slideOffsetPercent}%)` }}
          >
            {testimonials.map((review) => (
              <div
                key={review.id}
                className="w-full shrink-0 md:w-1/3 md:px-2.5"
              >
                <article className="flex h-full flex-col rounded-[20px] border border-black/10 bg-white p-6 sm:px-8 sm:py-7">
                  <StarRating rating={review.rating} showText={false} size="md" />
                  <div className="mt-3 sm:mt-4 flex items-center gap-1.5">
                    <h3 className="text-base sm:text-xl font-bold text-black">{review.name}</h3>
                    {review.verified && (
                      <CheckCircle2 className="h-5 w-5 shrink-0 fill-[#01AB31] text-white" />
                    )}
                  </div>
                  <p className="mt-2 sm:mt-3 text-sm sm:text-base leading-relaxed text-black/60">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                </article>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel slide dots */}
        {maxSlideIndex > 0 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {Array.from({ length: maxSlideIndex + 1 }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to review slide ${idx + 1}`}
                onClick={() => setReviewIndex(idx)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 cursor-pointer",
                  idx === clampedIndex ? "w-7 bg-black" : "w-2 bg-black/20 hover:bg-black/40",
                )}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
