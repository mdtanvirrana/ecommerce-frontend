"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { checkoutApi } from "@/services/api";
import { Breadcrumb } from "@/components/storefront/Breadcrumb";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatExactMoney } from "@/lib/utils";

export function OrdersListView() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer-orders", page],
    queryFn: () => checkoutApi.getOrders(page),
  });

  const orders = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-8 xl:px-0">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "My Orders" }]} />
      <h1 className="font-display text-[32px] sm:text-[40px] text-black">MY ORDERS</h1>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-[20px]" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-[20px] border border-black/10 p-10 text-center">
            <p className="font-semibold">Unable to load your orders.</p>
            <Link
              href="/login?redirect=/orders"
              className="mt-4 inline-flex h-11 items-center rounded-full bg-black px-6 text-sm text-white"
            >
              Sign In
            </Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-[20px] border border-black/10 p-14 text-center">
            <Package className="mx-auto h-10 w-10 text-black/30" />
            <p className="mt-3 text-lg font-bold">No orders yet</p>
            <p className="mt-1 text-sm text-black/60">
              Once you place an order, you can track its live status here.
            </p>
            <Link
              href="/shop"
              className="mt-5 inline-flex h-11 items-center rounded-full bg-black px-7 text-sm font-medium text-white"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-[20px] border border-black/10 p-5 sm:p-6 transition-colors hover:border-black/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base sm:text-lg font-bold text-black">{order.order_number}</p>
                    <p className="text-xs sm:text-sm text-black/60">
                      Placed on {formatDate(order.created_at)} • {order.items_count ?? order.items?.length ?? 0} item(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    <PaymentStatusBadge status={order.payment_status} />
                    <span className="ml-2 text-lg font-bold text-black">
                      {formatExactMoney(order.total_amount)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-full border border-black/15 px-5 py-2 text-sm disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-sm text-black/60">
                  Page {meta.current_page} of {meta.last_page}
                </span>
                <button
                  type="button"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-full border border-black/15 px-5 py-2 text-sm disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
