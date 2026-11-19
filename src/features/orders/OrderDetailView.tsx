"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { checkoutApi } from "@/services/api";
import { Breadcrumb } from "@/components/storefront/Breadcrumb";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/apiClient";
import { cn, formatDateTime, formatExactMoney } from "@/lib/utils";
import type { CheckoutResponse, OrderStatus } from "@/types/api";

const STEPS: OrderStatus[] = ["pending", "paid", "processing", "shipped", "delivered"];

function RetryStripeForm({
  orderId,
  totalAmount,
  onDone,
}: {
  orderId: number;
  totalAmount: string;
  onDone: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    const { error } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) {
      toast.error(error.message || "Payment failed.");
      setBusy(false);
      return;
    }
    try {
      await checkoutApi.confirmPayment(orderId);
      toast.success("Payment verified!");
    } catch {
      toast.info("Payment submitted — awaiting webhook confirmation.");
    }
    setBusy(false);
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || busy}
        className="h-12 w-full rounded-full bg-black text-sm font-medium text-white hover:bg-black/85 disabled:opacity-50 cursor-pointer"
      >
        {busy ? "Verifying..." : `Pay ${formatExactMoney(totalAmount)}`}
      </button>
    </form>
  );
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const [reconciling, setReconciling] = useState(false);
  const [retrySession, setRetrySession] = useState<CheckoutResponse | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customer-order", orderId],
    queryFn: () => checkoutApi.getOrder(orderId),
  });

  const order = data?.data;

  const publishableKey =
    retrySession?.publishable_key || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  const stripePromise = useMemo(
    () => (publishableKey && publishableKey.startsWith("pk_") ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  const handleReconcile = async () => {
    if (!order) return;
    setReconciling(true);
    try {
      await checkoutApi.confirmPayment(order.id);
      await refetch();
      toast.success("Payment status refreshed from Stripe.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not verify payment status.");
    } finally {
      setReconciling(false);
    }
  };

  const handleInitRetry = async () => {
    if (!order) return;
    try {
      const res = await checkoutApi.retryPayment(order.id);
      setRetrySession(res.data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not start payment retry.");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-8 xl:px-0 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-[20px]" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-[600px] px-4 py-16 text-center">
        <h1 className="font-display text-3xl">ORDER NOT FOUND</h1>
        <p className="mt-2 text-black/60">
          You do not have permission to view this order, or it does not exist.
        </p>
        <Link
          href="/orders"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-black px-7 text-sm text-white"
        >
          Back to My Orders
        </Link>
      </div>
    );
  }

  const currentStepIdx = STEPS.indexOf(order.status);

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-8 xl:px-0">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "My Orders", href: "/orders" },
          { label: order.order_number },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-[36px] text-black">{order.order_number}</h1>
          <p className="text-sm text-black/60">Placed on {formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment_status} />
        </div>
      </div>

      {/* Order Status Tracker */}
      <div className="mt-6 rounded-[20px] border border-black/10 p-6">
        {order.status === "cancelled" ? (
          <div className="flex items-center gap-3 text-[#FF3333]">
            <XCircle className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-bold">Order Cancelled</p>
              {order.cancellation_reason && (
                <p className="text-sm text-black/70">{order.cancellation_reason}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {STEPS.map((step, idx) => {
              const reached = currentStepIdx >= idx;
              return (
                <div key={step} className="flex flex-col items-center text-center">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
                      reached ? "bg-black text-white" : "bg-[#F0F0F0] text-black/40",
                    )}
                  >
                    {reached ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs sm:text-sm capitalize",
                      reached ? "font-semibold text-black" : "text-black/40",
                    )}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {order.status === "pending" && order.payment_status !== "succeeded" && (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-black/10 pt-5">
            <button
              type="button"
              onClick={handleReconcile}
              disabled={reconciling}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium text-black hover:bg-[#F0F0F0] cursor-pointer"
            >
              <RefreshCw className={cn("h-4 w-4", reconciling && "animate-spin")} />
              Verify Payment Status
            </button>
            <button
              type="button"
              onClick={handleInitRetry}
              className="inline-flex h-10 items-center rounded-full bg-black px-6 text-sm font-medium text-white hover:bg-black/85 cursor-pointer"
            >
              Retry Payment
            </button>
          </div>
        )}

        {retrySession && stripePromise && (
          <div className="mt-6 border-t border-black/10 pt-6 max-w-md">
            <Elements stripe={stripePromise} options={{ clientSecret: retrySession.client_secret }}>
              <RetryStripeForm
                orderId={order.id}
                totalAmount={order.total_amount}
                onDone={() => {
                  setRetrySession(null);
                  void refetch();
                }}
              />
            </Elements>
          </div>
        )}
      </div>

      {/* Items + Shipping + Totals */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-[20px] border border-black/10 p-6 lg:col-span-7">
          <h2 className="text-lg font-bold text-black">Order Items</h2>
          <div className="mt-4 divide-y divide-black/10">
            {(order.items ?? []).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F0EEED]">
                    <img
                      src={item.image_url || "/images/style-casual.jpg"}
                      alt={item.product_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-black">{item.product_name}</p>
                    <p className="text-xs text-black/60">
                      SKU: {item.product_sku} • Qty {item.quantity}
                      {item.selected_size ? ` • ${item.selected_size}` : ""}
                      {item.selected_color ? ` • ${item.selected_color}` : ""}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-black">{formatExactMoney(item.line_total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-[20px] border border-black/10 p-6">
            <h2 className="text-lg font-bold text-black">Payment Summary</h2>
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-black/60">Subtotal</span>
                <span className="font-medium">{formatExactMoney(order.subtotal)}</span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-[#FF3333]">
                  <span>Discount ({order.coupon_code})</span>
                  <span>-{formatExactMoney(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-black/60">Shipping</span>
                <span>{formatExactMoney(order.shipping_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-black/10 pt-3 text-base font-bold">
                <span>Total</span>
                <span>{formatExactMoney(order.total_amount)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-black/10 p-6 text-sm">
            <h2 className="text-lg font-bold text-black">Shipping Details</h2>
            <div className="mt-3 space-y-1 text-black/75">
              <p className="font-semibold text-black">{order.shipping.full_name}</p>
              <p>{order.shipping.email}</p>
              <p>{order.shipping.phone}</p>
              <p>{order.shipping.address}</p>
              <p>
                {order.shipping.city}, {order.shipping.postal_code}
              </p>
              {order.shipping.delivery_instructions && (
                <p className="pt-2 text-xs text-black/60">
                  Note: {order.shipping.delivery_instructions}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
