"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import { useCart } from "@/providers/CartProvider";
import { useCustomerAuth } from "@/providers/CustomerAuthProvider";
import { Breadcrumb } from "@/components/storefront/Breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/utils";
import { couponApplySchema } from "@/schemas";
import type { z } from "zod";

type CouponFormValues = z.infer<typeof couponApplySchema>;

export function CartView() {
  const router = useRouter();
  const { customer } = useCustomerAuth();
  const { cart, loading, mutating, updateQuantity, removeItem, applyCoupon, removeCoupon } = useCart();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponApplySchema),
    defaultValues: { code: "" },
  });

  const handleApplyCoupon = async (values: CouponFormValues) => {
    const result = await applyCoupon(values.code);
    if (result.ok) {
      reset({ code: "" });
    } else if (result.error) {
      setError("code", { type: "server", message: result.error });
    }
  };

  const handleCheckout = () => {
    if (!customer) {
      router.push("/login?redirect=/checkout");
      return;
    }
    router.push("/checkout");
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-8 xl:px-0">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />

      <h1 className="font-display text-[32px] sm:text-[40px] leading-tight text-black">
        YOUR CART
      </h1>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Skeleton className="h-[340px] rounded-[20px] lg:col-span-7" />
          <Skeleton className="h-[340px] rounded-[20px] lg:col-span-5" />
        </div>
      ) : cart.items.length === 0 ? (
        <div className="mt-8 rounded-[20px] border border-black/10 px-6 py-16 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-black/30" />
          <h2 className="mt-4 text-xl font-bold text-black">Your cart is empty</h2>
          <p className="mt-1 text-sm text-black/60">
            Explore our latest arrivals and add items you love.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-black px-8 text-sm font-medium text-white hover:bg-black/85"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
          {/* Left Cart Items List — Exact Cart.jpg & Cart (1).jpg Card */}
          <div className="rounded-[20px] border border-black/10 px-4 py-4 sm:px-6 sm:py-5 lg:col-span-7">
            <div className="divide-y divide-black/10">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-3.5 sm:gap-4 py-4 first:pt-0 last:pb-0">
                  <Link
                    href={`/products/${item.slug}`}
                    className="h-[99px] w-[99px] sm:h-[124px] sm:w-[124px] shrink-0 overflow-hidden rounded-lg bg-[#F0EEED]"
                  >
                    <img
                      src={item.image_url || "/images/style-casual.jpg"}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/products/${item.slug}`}
                          className="block truncate text-base sm:text-xl font-bold text-black hover:underline"
                        >
                          {item.name}
                        </Link>
                        {item.selected_size && (
                          <p className="mt-0.5 text-xs sm:text-sm text-black">
                            Size: <span className="text-black/60">{item.selected_size}</span>
                          </p>
                        )}
                        {item.selected_color && (
                          <p className="text-xs sm:text-sm text-black">
                            Color: <span className="text-black/60">{item.selected_color}</span>
                          </p>
                        )}
                        {!item.is_available && (
                          <p className="mt-1 text-xs font-medium text-[#FF3333]">
                            Only {item.stock_quantity} left in stock
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={mutating}
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="p-1 text-[#FF3333] hover:bg-[#FF3333]/10 rounded-md cursor-pointer"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-xl sm:text-2xl font-bold text-black">
                        {formatMoney(item.unit_price)}
                      </span>

                      <div className="inline-flex h-8 sm:h-11 items-center gap-4 sm:gap-5 rounded-full bg-[#F0F0F0] px-3.5 sm:px-5">
                        <button
                          type="button"
                          aria-label="Decrease item quantity"
                          disabled={mutating || item.quantity <= 1}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="text-black disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium text-black">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase item quantity"
                          disabled={mutating || item.quantity >= item.stock_quantity}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="text-black disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Order Summary — Exact Cart.jpg & Cart (1).jpg Card */}
          <div className="rounded-[20px] border border-black/10 p-5 sm:p-6 lg:col-span-5">
            <h2 className="text-xl sm:text-2xl font-bold text-black">Order Summary</h2>

            <div className="mt-5 space-y-4 text-base sm:text-xl">
              <div className="flex items-center justify-between">
                <span className="text-black/60">Subtotal</span>
                <span className="font-bold text-black">{formatMoney(cart.subtotal)}</span>
              </div>

              {Number(cart.discount_amount) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-black/60">
                    Discount
                    {cart.coupon && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FF3333]/10 px-2.5 py-0.5 text-xs font-medium text-[#FF3333]">
                        {cart.coupon.code}
                        <button
                          type="button"
                          onClick={removeCoupon}
                          aria-label="Remove coupon"
                          className="hover:text-black cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-[#FF3333]">
                    -{formatMoney(cart.discount_amount)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-black/60">Delivery Fee</span>
                <span className="font-bold text-black">
                  {Number(cart.shipping_amount) === 0 ? "Free" : formatMoney(cart.shipping_amount)}
                </span>
              </div>

              <hr className="border-black/10" />

              <div className="flex items-center justify-between">
                <span className="text-black">Total</span>
                <span className="text-xl sm:text-2xl font-bold text-black">
                  {formatMoney(cart.total_amount)}
                </span>
              </div>
            </div>

            {cart.coupon_notice && (
              <p className="mt-3 text-xs text-[#FF3333]">{cart.coupon_notice}</p>
            )}

            {/* Promo Code Input */}
            <form noValidate onSubmit={handleSubmit(handleApplyCoupon)} className="mt-6">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/40" />
                  <input
                    type="text"
                    aria-invalid={Boolean(errors.code)}
                    placeholder="Add promo code"
                    className="h-12 w-full rounded-full bg-[#F0F0F0] pl-11 pr-4 text-sm sm:text-base text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/20"
                    {...register("code")}
                  />
                </div>
                <button
                  type="submit"
                  disabled={mutating}
                  className="h-12 rounded-full bg-black px-6 sm:px-8 text-sm sm:text-base font-medium text-white hover:bg-black/85 disabled:opacity-50 cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {errors.code && (
                <p role="alert" className="mt-1.5 pl-4 text-xs font-medium text-[#FF3333]">
                  {errors.code.message}
                </p>
              )}
            </form>

            <p className="mt-2.5 text-xs text-black/50">
              Try demo codes: <span className="font-semibold text-black">WELCOME20</span> (20% off) or{" "}
              <span className="font-semibold text-black">SAVE25</span> ($25 off $150+)
            </p>

            <button
              type="button"
              onClick={handleCheckout}
              className="mt-6 inline-flex h-[54px] sm:h-[60px] w-full items-center justify-center gap-2.5 rounded-full bg-black text-sm sm:text-base font-medium text-white transition-colors hover:bg-black/85 cursor-pointer"
            >
              Go to Checkout <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
