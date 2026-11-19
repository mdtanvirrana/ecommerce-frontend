"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Lock, ShieldCheck, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { checkoutSchema, couponApplySchema } from "@/schemas";
import { checkoutApi } from "@/services/api";
import { useCart } from "@/providers/CartProvider";
import { useCustomerAuth } from "@/providers/CustomerAuthProvider";
import { Breadcrumb } from "@/components/storefront/Breadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/apiClient";
import { applyApiErrorsToForm } from "@/lib/formErrors";
import { formatExactMoney } from "@/lib/utils";
import type { CheckoutResponse } from "@/types/api";
import type { z } from "zod";

type CheckoutValues = z.infer<typeof checkoutSchema>;
type CouponValues = z.infer<typeof couponApplySchema>;

function StripePaymentForm({
  orderId,
  orderNumber,
  totalAmount,
  onVerified,
}: {
  orderId: number;
  orderNumber: string;
  totalAmount: string;
  onVerified: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "Payment failed. Please check your card details.");
      setSubmitting(false);
      return;
    }

    // NEVER trust client-side success alone — ask Laravel to verify directly with Stripe server API.
    if (paymentIntent) {
      try {
        await checkoutApi.confirmPayment(orderId);
      } catch {
        // Even if webhook is still processing, redirect to order detail which shows real status.
      }
    }

    toast.success(`Payment submitted for ${orderNumber}. Verifying with server...`);
    onVerified();
  };

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <div className="rounded-xl border border-black/10 bg-[#FAFAFA] p-4">
        <p className="text-xs font-medium text-black/60">
          Order <span className="font-bold text-black">{orderNumber}</span> • Payable Amount:{" "}
          <span className="font-bold text-black">{formatExactMoney(totalAmount)}</span>
        </p>
      </div>

      <PaymentElement />

      {errorMessage && (
        <div className="rounded-xl bg-[#FF3333]/10 p-3 text-sm text-[#FF3333]">{errorMessage}</div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-black text-base font-medium text-white hover:bg-black/85 disabled:opacity-50 cursor-pointer"
      >
        <Lock className="h-4 w-4" />
        {submitting ? "Verifying Payment..." : `Pay ${formatExactMoney(totalAmount)}`}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-black/50">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        Secured by Stripe Test Mode • Server-side webhook verification
      </p>
    </form>
  );
}

export function CheckoutView() {
  const router = useRouter();
  const { customer, loading: authLoading } = useCustomerAuth();
  const {
    cart,
    mutating: cartMutating,
    applyCoupon,
    removeCoupon,
    refreshCart,
    clearLocalAfterCheckout,
  } = useCart();

  const [checkoutSession, setCheckoutSession] = useState<CheckoutResponse | null>(null);
  const [initializing, setInitializing] = useState(false);

  const couponForm = useForm<CouponValues>({
    resolver: zodResolver(couponApplySchema),
    defaultValues: { code: "" },
  });

  const onApplyCheckoutCoupon = async (values: CouponValues) => {
    const result = await applyCoupon(values.code);
    if (result.ok) {
      couponForm.reset({ code: "" });
    } else if (result.error) {
      couponForm.setError("code", { type: "server", message: result.error });
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shipping_full_name: "",
      shipping_email: "",
      shipping_phone: "",
      shipping_address: "",
      shipping_city: "",
      shipping_postal_code: "",
      delivery_instructions: "",
    },
  });

  useEffect(() => {
    if (customer) {
      setValue("shipping_full_name", customer.name);
      setValue("shipping_email", customer.email);
      if (customer.phone) setValue("shipping_phone", customer.phone);
    }
  }, [customer, setValue]);

  const publishableKey =
    checkoutSession?.publishable_key ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    "";

  const stripePromise = useMemo(
    () => (publishableKey && publishableKey.startsWith("pk_") ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  const onSubmitShipping = async (values: CheckoutValues) => {
    setInitializing(true);
    try {
      const res = await checkoutApi.checkout({
        ...values,
        coupon_code: cart.coupon?.code,
      });
      setCheckoutSession(res.data);
      toast.success("Shipping validated. Complete Stripe payment below.");
    } catch (err) {
      applyApiErrorsToForm(err, setError);
      toast.error(err instanceof ApiError ? err.message : "Could not initialize checkout.");
    } finally {
      setInitializing(false);
    }
  };

  if (authLoading) {
    return <div className="mx-auto max-w-[1240px] px-4 py-12">Loading checkout...</div>;
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-[600px] px-4 py-16 text-center">
        <h1 className="font-display text-3xl">SIGN IN TO CHECKOUT</h1>
        <p className="mt-2 text-black/60">
          Sign in or create an account so your order and payment receipt are securely saved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login?redirect=/checkout"
            className="inline-flex h-12 items-center rounded-full bg-black px-8 text-sm font-medium text-white"
          >
            Sign In
          </Link>
          <Link
            href="/register?redirect=/checkout"
            className="inline-flex h-12 items-center rounded-full border border-black/15 px-8 text-sm font-medium text-black"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  if (!checkoutSession && cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-[600px] px-4 py-16 text-center">
        <h1 className="font-display text-3xl">YOUR CART IS EMPTY</h1>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-black px-8 text-sm font-medium text-white"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-8 xl:px-0">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Cart", href: "/cart" },
          { label: "Checkout" },
        ]}
      />

      <h1 className="font-display text-[32px] sm:text-[40px] text-black">CHECKOUT</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left: Shipping Form OR Stripe Payment Step */}
        <div className="rounded-[20px] border border-black/10 p-6 sm:p-8 lg:col-span-7">
          {!checkoutSession ? (
            <form noValidate onSubmit={handleSubmit(onSubmitShipping)} className="space-y-5">
              <h2 className="text-xl font-bold text-black">1. Shipping Information</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="shipping_full_name">Full Name</Label>
                  <Input id="shipping_full_name" aria-invalid={Boolean(errors.shipping_full_name)} {...register("shipping_full_name")} />
                  {errors.shipping_full_name && (
                    <p role="alert" className="text-xs font-medium text-[#FF3333]">{errors.shipping_full_name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="shipping_email">Email</Label>
                  <Input id="shipping_email" type="email" aria-invalid={Boolean(errors.shipping_email)} {...register("shipping_email")} />
                  {errors.shipping_email && (
                    <p role="alert" className="text-xs font-medium text-[#FF3333]">{errors.shipping_email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shipping_phone">Phone Number</Label>
                <Input id="shipping_phone" aria-invalid={Boolean(errors.shipping_phone)} {...register("shipping_phone")} placeholder="+1 555 0100" />
                {errors.shipping_phone && (
                  <p role="alert" className="text-xs font-medium text-[#FF3333]">{errors.shipping_phone.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shipping_address">Shipping Address</Label>
                <Input
                  id="shipping_address"
                  aria-invalid={Boolean(errors.shipping_address)}
                  {...register("shipping_address")}
                  placeholder="Street address, apartment, suite"
                />
                {errors.shipping_address && (
                  <p role="alert" className="text-xs font-medium text-[#FF3333]">{errors.shipping_address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="shipping_city">City</Label>
                  <Input id="shipping_city" aria-invalid={Boolean(errors.shipping_city)} {...register("shipping_city")} />
                  {errors.shipping_city && (
                    <p role="alert" className="text-xs font-medium text-[#FF3333]">{errors.shipping_city.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="shipping_postal_code">Postal Code</Label>
                  <Input id="shipping_postal_code" aria-invalid={Boolean(errors.shipping_postal_code)} {...register("shipping_postal_code")} />
                  {errors.shipping_postal_code && (
                    <p role="alert" className="text-xs font-medium text-[#FF3333]">{errors.shipping_postal_code.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="delivery_instructions">Delivery Instructions (Optional)</Label>
                <Textarea
                  id="delivery_instructions"
                  aria-invalid={Boolean(errors.delivery_instructions)}
                  {...register("delivery_instructions")}
                  placeholder="Gate code, reception drop-off, etc."
                />
                {errors.delivery_instructions && (
                  <p role="alert" className="text-xs font-medium text-[#FF3333]">{errors.delivery_instructions.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={initializing}
                className="h-13 w-full rounded-full bg-black text-base font-medium text-white hover:bg-black/85 disabled:opacity-50 cursor-pointer"
              >
                {initializing ? "Validating Order & Initializing Stripe..." : "Continue to Payment"}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-black">2. Stripe Test Mode Payment</h2>
                <Link
                  href={`/orders/${checkoutSession.order.id}`}
                  className="text-xs font-medium text-black/60 underline hover:text-black"
                >
                  View Pending Order
                </Link>
              </div>

              {stripePromise && checkoutSession.client_secret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: checkoutSession.client_secret,
                    appearance: { theme: "stripe" },
                  }}
                >
                  <StripePaymentForm
                    orderId={checkoutSession.order.id}
                    orderNumber={checkoutSession.order.order_number}
                    totalAmount={checkoutSession.order.total_amount}
                    onVerified={async () => {
                      clearLocalAfterCheckout();
                      await refreshCart();
                      router.push(`/orders/${checkoutSession.order.id}`);
                    }}
                  />
                </Elements>
              ) : (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  Stripe Publishable Key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_KEY`) is
                  not configured with a valid `pk_test_...` key yet. Configure Stripe Test Mode keys
                  in `.env` to render Stripe Elements.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Authoritative Server-Computed Order Summary */}
        <div className="rounded-[20px] border border-black/10 p-6 lg:col-span-5">
          <h2 className="text-xl font-bold text-black">Order Summary</h2>
          <div className="mt-4 divide-y divide-black/10">
            {(checkoutSession?.order.items ?? cart.items).map((item, idx) => {
              const name = "product_name" in item ? item.product_name : item.name;
              const lineTotal = item.line_total;
              return (
                <div key={idx} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-black">{name}</p>
                    <p className="text-xs text-black/60">
                      Qty {item.quantity}
                      {item.selected_size ? ` • ${item.selected_size}` : ""}
                      {item.selected_color ? ` • ${item.selected_color}` : ""}
                    </p>
                  </div>
                  <span className="font-semibold text-black">{formatExactMoney(lineTotal)}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-2.5 border-t border-black/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-black/60">Subtotal</span>
              <span className="font-medium">
                {formatExactMoney(checkoutSession?.order.subtotal ?? cart.subtotal)}
              </span>
            </div>
            {Number(checkoutSession?.order.discount_amount ?? cart.discount_amount) > 0 && (
              <div className="flex items-center justify-between text-[#FF3333]">
                <span className="inline-flex items-center gap-2">
                  Coupon Discount ({checkoutSession?.order.coupon_code ?? cart.coupon?.code})
                  {!checkoutSession && cart.coupon && (
                    <button
                      type="button"
                      disabled={cartMutating}
                      onClick={removeCoupon}
                      aria-label="Remove coupon"
                      className="rounded-full p-0.5 hover:bg-[#FF3333]/10 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
                <span className="font-medium">
                  -{formatExactMoney(checkoutSession?.order.discount_amount ?? cart.discount_amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-black/60">Shipping</span>
              <span className="font-medium">
                {Number(checkoutSession?.order.shipping_amount ?? cart.shipping_amount) === 0
                  ? "Free"
                  : formatExactMoney(checkoutSession?.order.shipping_amount ?? cart.shipping_amount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-3 text-lg font-bold">
              <span>Payable Total</span>
              <span>
                {formatExactMoney(checkoutSession?.order.total_amount ?? cart.total_amount)}
              </span>
            </div>
          </div>

          {!checkoutSession && (
            <div className="mt-5 border-t border-black/10 pt-4">
              <form
                noValidate
                onSubmit={couponForm.handleSubmit(onApplyCheckoutCoupon)}
                className="space-y-1.5"
              >
                <Label htmlFor="checkout-coupon-code" className="text-xs text-black/70">
                  Have a promo code?
                </Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                    <Input
                      id="checkout-coupon-code"
                      aria-invalid={Boolean(couponForm.formState.errors.code)}
                      placeholder="Enter promo code (e.g. WELCOME20)"
                      className="pl-10 rounded-full bg-[#F0F0F0] border-transparent text-black"
                      {...couponForm.register("code")}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={cartMutating}
                    className="h-10 rounded-full bg-black px-5 text-xs font-medium text-white hover:bg-black/85 disabled:opacity-50 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {couponForm.formState.errors.code && (
                  <p role="alert" className="pl-2 text-xs font-medium text-[#FF3333]">
                    {couponForm.formState.errors.code.message}
                  </p>
                )}
              </form>
            </div>
          )}

          <p className="mt-4 text-xs text-black/50">
            All prices, coupon discounts, and totals are independently computed and verified by the
            Laravel backend.
          </p>
        </div>
      </div>
    </div>
  );
}
