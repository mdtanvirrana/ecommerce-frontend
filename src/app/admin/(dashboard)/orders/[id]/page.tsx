"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CreditCard, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/services/api";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/StatusBadge";
import { getApiErrorMessage } from "@/lib/formErrors";
import { formatDateTime, formatExactMoney } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/types/api";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  succeeded: "Succeeded (Paid)",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  needs_resolution: "Needs Resolution",
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { hasPermission } = useAdminAuth();
  const canUpdateStatus = hasPermission("orders.update_status");
  const canCancel = hasPermission("orders.cancel");

  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<OrderStatus | null>(null);
  const [orderStatusError, setOrderStatusError] = useState<string | null>(null);

  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus | null>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentStatusError, setPaymentStatusError] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-order", params.id],
    queryFn: () => adminApi.getOrder(params.id),
  });
  const order = data?.data;

  const currentOrderStatus = selectedOrderStatus ?? order?.status ?? "pending";
  const currentPaymentStatus = selectedPaymentStatus ?? order?.payment_status ?? "pending";

  const orderStatusOptions = useMemo(() => {
    if (!order) return {};
    const map: Record<string, string> = {
      [order.status]: `${ORDER_STATUS_LABELS[order.status]} (Current)`,
    };
    for (const next of order.allowed_transitions) {
      if (next === "cancelled" && !canCancel) continue;
      if (next === "paid" && order.payment_status !== "succeeded") continue;
      map[next] = ORDER_STATUS_LABELS[next];
    }
    return map;
  }, [order, canCancel]);

  const invalidateOrderQueries = async () => {
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const handleTransition = async (nextStatus: OrderStatus) => {
    if (!order) return;
    if (nextStatus === "cancelled") {
      setCancelError(null);
      setCancelOpen(true);
      return;
    }
    if (nextStatus === order.status) {
      setOrderStatusError("Select a different status to update.");
      return;
    }

    setOrderStatusError(null);
    setUpdatingOrder(true);
    try {
      await adminApi.updateOrderStatus(order.id, nextStatus);
      toast.success(`Order status updated to ${ORDER_STATUS_LABELS[nextStatus]}.`);
      setSelectedOrderStatus(null);
      await invalidateOrderQueries();
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to update order status.");
      setOrderStatusError(msg);
      toast.error(msg);
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleUpdatePaymentStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (currentPaymentStatus === order.payment_status) {
      setPaymentStatusError("Select a different payment status to update.");
      return;
    }

    setPaymentStatusError(null);
    setUpdatingPayment(true);
    try {
      await adminApi.updateOrderPaymentStatus(
        order.id,
        currentPaymentStatus,
        paymentNote.trim() || undefined,
      );
      toast.success(`Payment status updated to ${PAYMENT_STATUS_LABELS[currentPaymentStatus]}.`);
      setSelectedPaymentStatus(null);
      setSelectedOrderStatus(null);
      setPaymentNote("");
      await invalidateOrderQueries();
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to update payment status.");
      setPaymentStatusError(msg);
      toast.error(msg);
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (cancelReason.trim().length < 3) {
      setCancelError("Please enter a brief cancellation reason (at least 3 characters).");
      return;
    }
    setCancelError(null);
    setUpdatingOrder(true);
    try {
      await adminApi.cancelOrder(order.id, cancelReason.trim());
      toast.success("Order cancelled and stock restored atomically.");
      setCancelOpen(false);
      setCancelReason("");
      setSelectedOrderStatus(null);
      await invalidateOrderQueries();
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to cancel order.");
      setCancelError(msg);
      toast.error(msg);
    } finally {
      setUpdatingOrder(false);
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

  const hasNextOrderChoices = Object.keys(orderStatusOptions).length > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to orders"
            render={<Link href="/admin/orders" />}
            nativeButton={false}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold">{order.order_number}</h1>
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.payment_status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Created {formatDateTime(order.created_at)}
            </p>
          </div>
        </div>

        {/* Quick 1-click fulfillment buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canUpdateStatus &&
            forwardTransitions.map((next) => (
              <Button
                key={next}
                disabled={updatingOrder || updatingPayment}
                onClick={() => handleTransition(next)}
                className="capitalize"
              >
                Mark as {next}
              </Button>
            ))}

          {canCancel && order.is_cancellable && (
            <Button
              variant="destructive"
              disabled={updatingOrder || updatingPayment}
              onClick={() => {
                setCancelError(null);
                setCancelOpen(true);
              }}
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
            <div className="divide-y divide-border">
              {(order.items ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image_url || "/images/style-casual.jpg"}
                      alt={item.product_name}
                      className="h-14 w-14 rounded-lg bg-muted object-cover border border-border"
                    />
                    <div>
                      <p className="font-semibold text-sm">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {item.product_sku} • {formatExactMoney(item.unit_price)} ×{" "}
                        {item.quantity}
                        {item.selected_size ? ` • ${item.selected_size}` : ""}
                        {item.selected_color ? ` • ${item.selected_color}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">{formatExactMoney(item.line_total)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatExactMoney(order.subtotal)}</span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Discount ({order.coupon_code})</span>
                  <span>-{formatExactMoney(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatExactMoney(order.shipping_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <span>Total</span>
                <span>{formatExactMoney(order.total_amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-4">
          {/* Order Status & Payment Status Update Card */}
          {canUpdateStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Update Order &amp; Payment Status</CardTitle>
                <CardDescription>
                  Changes are logged and notify the customer by email.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Order Status Form */}
                <form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleTransition(currentOrderStatus);
                  }}
                  className="space-y-3"
                >
                  <div className="space-y-1.5">
                    <Label className="inline-flex items-center gap-1.5">
                      <PackageCheck className="h-3.5 w-3.5 text-muted-foreground" /> Order Status
                    </Label>
                    <Select
                      value={currentOrderStatus}
                      items={orderStatusOptions}
                      disabled={!hasNextOrderChoices || updatingOrder}
                      onValueChange={(value) => {
                        if (value) {
                          setSelectedOrderStatus(value as OrderStatus);
                          setOrderStatusError(null);
                        }
                      }}
                    >
                      <SelectTrigger aria-label="Order status selector" className="w-full">
                        <SelectValue>
                          {orderStatusOptions[currentOrderStatus] ??
                            ORDER_STATUS_LABELS[currentOrderStatus]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(orderStatusOptions).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!hasNextOrderChoices && (
                      <p className="text-xs text-muted-foreground">
                        {order.status === "pending" && order.payment_status !== "succeeded"
                          ? "Mark payment as succeeded below to advance this order to Paid."
                          : `Order is in terminal "${order.status}" state.`}
                      </p>
                    )}
                    {orderStatusError && (
                      <p
                        role="alert"
                        className="text-xs font-medium text-red-600 dark:text-red-400"
                      >
                        {orderStatusError}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      !hasNextOrderChoices ||
                      currentOrderStatus === order.status ||
                      updatingOrder
                    }
                  >
                    {updatingOrder ? "Updating Order Status..." : "Update Order Status"}
                  </Button>
                </form>

                <Separator />

                {/* Payment Status Form */}
                <form noValidate onSubmit={handleUpdatePaymentStatus} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="inline-flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> Payment Status
                    </Label>
                    <Select
                      value={currentPaymentStatus}
                      items={PAYMENT_STATUS_LABELS}
                      disabled={updatingPayment}
                      onValueChange={(value) => {
                        if (value) {
                          setSelectedPaymentStatus(value as PaymentStatus);
                          setPaymentStatusError(null);
                        }
                      }}
                    >
                      <SelectTrigger aria-label="Payment status selector" className="w-full">
                        <SelectValue>{PAYMENT_STATUS_LABELS[currentPaymentStatus]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAYMENT_STATUS_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="payment-audit-note">Payment Note (Optional)</Label>
                    <Input
                      id="payment-audit-note"
                      value={paymentNote}
                      onChange={(e) => {
                        setPaymentNote(e.target.value);
                        setPaymentStatusError(null);
                      }}
                      placeholder="e.g. Manual bank verification / refund ref"
                    />
                    {paymentStatusError && (
                      <p
                        role="alert"
                        className="text-xs font-medium text-red-600 dark:text-red-400"
                      >
                        {paymentStatusError}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    disabled={
                      currentPaymentStatus === order.payment_status || updatingPayment
                    }
                  >
                    {updatingPayment ? "Updating Payment Status..." : "Update Payment Status"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Customer &amp; Shipping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <p className="font-semibold">{order.shipping.full_name}</p>
              <p className="text-muted-foreground">{order.shipping.email}</p>
              <p className="text-muted-foreground">{order.shipping.phone}</p>
              <hr className="my-2 border-border" />
              <p>{order.shipping.address}</p>
              <p>
                {order.shipping.city}, {order.shipping.postal_code}
              </p>
              {order.shipping.delivery_instructions && (
                <p className="pt-1 text-xs text-muted-foreground">
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
                <span className="text-muted-foreground">Stock Deducted:</span>{" "}
                <span className="font-medium">{formatDateTime(order.stock_deducted_at)}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Stock Restored:</span>{" "}
                <span className="font-medium">{formatDateTime(order.stock_restored_at)}</span>
              </p>
              {order.cancellation_reason && (
                <p className="text-red-600 dark:text-red-400">
                  Cancel Reason: {order.cancellation_reason}
                </p>
              )}
              {(order.payments ?? []).map((p) => (
                <div key={p.id} className="mt-2 rounded-lg bg-muted/60 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold uppercase">{p.provider}</span>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                  <p className="font-mono break-all">PI: {p.stripe_payment_intent_id ?? "—"}</p>
                  {p.stripe_refund_id && (
                    <p className="font-mono break-all text-blue-600 dark:text-blue-400">
                      Refund: {p.stripe_refund_id}
                    </p>
                  )}
                  {p.failure_message && (
                    <p className="text-red-600 dark:text-red-400">Error: {p.failure_message}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel {order.order_number}?</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleCancel} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If this order was paid, cancelling will atomically restore product inventory once and
              initiate a Stripe refund when configured.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason">Cancellation Reason *</Label>
              <Input
                id="cancel-reason"
                aria-invalid={Boolean(cancelError)}
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  setCancelError(null);
                }}
                placeholder="Customer requested cancellation"
              />
              {cancelError && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {cancelError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
                Keep Order
              </Button>
              <Button type="submit" variant="destructive" disabled={updatingOrder}>
                {updatingOrder ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
