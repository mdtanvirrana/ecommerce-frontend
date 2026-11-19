"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/services/api";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/StatusBadge";
import { ApiError } from "@/lib/apiClient";
import { formatDateTime, formatExactMoney } from "@/lib/utils";
import type { OrderStatus } from "@/types/api";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { hasPermission } = useAdminAuth();

  const [updating, setUpdating] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-order", params.id],
    queryFn: () => adminApi.getOrder(params.id),
  });
  const order = data?.data;

  const handleTransition = async (nextStatus: OrderStatus) => {
    if (!order) return;
    setUpdating(true);
    try {
      await adminApi.updateOrderStatus(order.id, nextStatus);
      toast.success(`Order status updated to ${nextStatus}.`);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setUpdating(true);
    try {
      await adminApi.cancelOrder(order.id, cancelReason || undefined);
      toast.success("Order cancelled and stock restored atomically.");
      setCancelOpen(false);
      setCancelReason("");
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to cancel order.");
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return <Card className="p-8 text-center">Order not found.</Card>;
  }

  const forwardTransitions = order.allowed_transitions.filter(
    (s) => s !== "cancelled" && !(s === "paid" && order.payment_status !== "succeeded"),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon">
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold">{order.order_number}</h1>
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.payment_status} />
            </div>
            <p className="text-xs text-black/55 dark:text-zinc-400">
              Created {formatDateTime(order.created_at)}
            </p>
          </div>
        </div>

        {/* Permission-gated status lifecycle controls */}
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission("orders.update_status") &&
            forwardTransitions.map((next) => (
              <Button
                key={next}
                disabled={updating}
                onClick={() => handleTransition(next)}
                className="capitalize"
              >
                Mark as {next}
              </Button>
            ))}

          {hasPermission("orders.cancel") && order.is_cancellable && (
            <Button
              variant="destructive"
              disabled={updating}
              onClick={() => setCancelOpen(true)}
            >
              <Ban className="h-4 w-4" /> Cancel Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-black/10 dark:divide-zinc-800">
              {(order.items ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image_url || "/images/style-casual.jpg"}
                      alt={item.product_name}
                      className="h-14 w-14 rounded-lg bg-[#F0EEED] object-cover"
                    />
                    <div>
                      <p className="font-semibold text-sm">{item.product_name}</p>
                      <p className="text-xs text-black/55 dark:text-zinc-400">
                        SKU: {item.product_sku} • {formatExactMoney(item.unit_price)} × {item.quantity}
                        {item.selected_size ? ` • ${item.selected_size}` : ""}
                        {item.selected_color ? ` • ${item.selected_color}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">{formatExactMoney(item.line_total)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-black/10 dark:border-zinc-800 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-black/60 dark:text-zinc-400">Subtotal</span>
                <span>{formatExactMoney(order.subtotal)}</span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-[#FF3333]">
                  <span>Discount ({order.coupon_code})</span>
                  <span>-{formatExactMoney(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-black/60 dark:text-zinc-400">Shipping</span>
                <span>{formatExactMoney(order.shipping_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-black/10 dark:border-zinc-800 pt-2 text-base font-bold">
                <span>Total</span>
                <span>{formatExactMoney(order.total_amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer &amp; Shipping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <p className="font-semibold">{order.shipping.full_name}</p>
              <p className="text-black/65 dark:text-zinc-400">{order.shipping.email}</p>
              <p className="text-black/65 dark:text-zinc-400">{order.shipping.phone}</p>
              <hr className="my-2 border-black/10 dark:border-zinc-800" />
              <p>{order.shipping.address}</p>
              <p>
                {order.shipping.city}, {order.shipping.postal_code}
              </p>
              {order.shipping.delivery_instructions && (
                <p className="pt-1 text-xs text-black/55">
                  Note: {order.shipping.delivery_instructions}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment &amp; Inventory Audit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p>
                <span className="text-black/55 dark:text-zinc-400">Stock Deducted:</span>{" "}
                <span className="font-medium">{formatDateTime(order.stock_deducted_at)}</span>
              </p>
              <p>
                <span className="text-black/55 dark:text-zinc-400">Stock Restored:</span>{" "}
                <span className="font-medium">{formatDateTime(order.stock_restored_at)}</span>
              </p>
              {order.cancellation_reason && (
                <p className="text-[#FF3333]">Cancel Reason: {order.cancellation_reason}</p>
              )}
              {(order.payments ?? []).map((p) => (
                <div
                  key={p.id}
                  className="mt-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold uppercase">{p.provider}</span>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                  <p className="font-mono break-all">PI: {p.stripe_payment_intent_id ?? "—"}</p>
                  {p.stripe_refund_id && (
                    <p className="font-mono break-all text-blue-600">Refund: {p.stripe_refund_id}</p>
                  )}
                  {p.failure_message && (
                    <p className="text-[#FF3333]">Error: {p.failure_message}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel {order.order_number}?</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCancel} className="space-y-4">
            <p className="text-sm text-black/65 dark:text-zinc-400">
              If this order was paid, cancelling will atomically restore product inventory once and
              initiate a Stripe refund when configured.
            </p>
            <div className="space-y-1.5">
              <Label>Cancellation Reason</Label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Customer requested cancellation"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
                Keep Order
              </Button>
              <Button type="submit" variant="destructive" disabled={updating}>
                {updating ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
