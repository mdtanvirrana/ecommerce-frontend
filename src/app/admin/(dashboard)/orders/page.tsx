"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/services/api";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/StatusBadge";
import { getApiErrorMessage } from "@/lib/formErrors";
import { formatDate, formatExactMoney } from "@/lib/utils";
import type { Order, OrderStatus, PaymentStatus } from "@/types/api";

const ORDER_STATUS_OPTIONS: Record<string, string> = {
  all: "All Order Statuses",
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_STATUS_FILTER_OPTIONS: Record<string, string> = {
  all: "All Payment Statuses",
  pending: "Pending",
  succeeded: "Succeeded (Paid)",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  needs_resolution: "Needs Resolution",
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  succeeded: "Succeeded (Paid)",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  needs_resolution: "Needs Resolution",
};

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAdminAuth();
  const canUpdateStatus = hasPermission("orders.update_status");
  const canCancel = hasPermission("orders.cancel");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Quick Update Order & Payment Status Modal State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [draftOrderStatus, setDraftOrderStatus] = useState<OrderStatus>("pending");
  const [draftPaymentStatus, setDraftPaymentStatus] = useState<PaymentStatus>("pending");
  const [draftNote, setDraftNote] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", debouncedSearch, status, paymentFilter, page],
    queryFn: () =>
      adminApi.getOrders({
        search: debouncedSearch || undefined,
        status: status === "all" ? undefined : status,
        payment_status: paymentFilter === "all" ? undefined : paymentFilter,
        page,
        per_page: 15,
      }),
  });

  const orders = data?.data ?? [];
  const meta = data?.meta;

  const openUpdateDialog = (order: Order) => {
    setEditingOrder(order);
    setDraftOrderStatus(order.status);
    setDraftPaymentStatus(order.payment_status);
    setDraftNote("");
    setModalError(null);
  };

  // Show all 6 lifecycle statuses (Pending, Paid, Processing, Shipped, Delivered, Cancelled)
  // while clearly disabling invalid backward/unpaid transitions.
  const modalOrderStatusItems = useMemo(() => {
    if (!editingOrder) return [];

    const allowed = new Set<OrderStatus>(editingOrder.allowed_transitions);
    if (editingOrder.status === "pending" && draftPaymentStatus === "succeeded") {
      allowed.add("paid");
      allowed.add("processing");
      allowed.add("shipped");
      allowed.add("delivered");
    }

    return ORDER_STATUS_SEQUENCE.map((st) => {
      const isCurrent = st === editingOrder.status;
      const requiresPaid =
        st === "paid" || st === "processing" || st === "shipped" || st === "delivered";
      const missingPayment = requiresPaid && draftPaymentStatus !== "succeeded";
      const missingCancelPerm = st === "cancelled" && !canCancel;
      const canSelect = isCurrent || (allowed.has(st) && !missingPayment && !missingCancelPerm);

      let suffix = "";
      if (isCurrent) suffix = " (Current)";
      else if (missingPayment && allowed.has(st)) suffix = " — Requires Paid";

      return {
        value: st,
        label: `${ORDER_STATUS_LABELS[st]}${suffix}`,
        disabled: !canSelect,
      };
    });
  }, [editingOrder, draftPaymentStatus, canCancel]);

  const modalOrderStatusMap = useMemo(
    () => Object.fromEntries(modalOrderStatusItems.map((i) => [i.value, i.label])),
    [modalOrderStatusItems],
  );

  const handleSaveStatuses = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    const paymentChanged = draftPaymentStatus !== editingOrder.payment_status;
    const orderChanged = draftOrderStatus !== editingOrder.status;

    if (!paymentChanged && !orderChanged) {
      setModalError("Please select a new order status or payment status to update.");
      return;
    }

    if (draftOrderStatus === "cancelled" && draftNote.trim().length < 3) {
      setModalError("Please enter a cancellation reason (at least 3 characters).");
      return;
    }

    setModalError(null);
    setSaving(true);

    try {
      let currentOrder = editingOrder;

      // 1. Update payment status first (marking succeeded auto-advances pending -> paid & deducts stock)
      if (paymentChanged) {
        const res = await adminApi.updateOrderPaymentStatus(
          editingOrder.id,
          draftPaymentStatus,
          draftNote.trim() || undefined,
        );
        currentOrder = res.data;
      }

      // 2. Update order status if it still differs from the desired status
      if (orderChanged && currentOrder.status !== draftOrderStatus) {
        if (draftOrderStatus === "cancelled") {
          await adminApi.cancelOrder(editingOrder.id, draftNote.trim() || undefined);
        } else {
          await adminApi.updateOrderStatus(
            editingOrder.id,
            draftOrderStatus,
            draftNote.trim() || undefined,
          );
        }
      }

      toast.success(`Order ${editingOrder.order_number} updated.`);
      setEditingOrder(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-order", String(editingOrder.id)] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to update order status.");
      setModalError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Inspect verified payments, update order and payment statuses, and manage cancellations.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search order #, customer, email..."
            className="pl-10"
          />
        </div>

        <Select
          value={status}
          items={ORDER_STATUS_OPTIONS}
          onValueChange={(value) => {
            setStatus(value ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter orders by status" className="min-w-[185px]">
            <SelectValue>{ORDER_STATUS_OPTIONS[status] ?? "All Order Statuses"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ORDER_STATUS_OPTIONS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={paymentFilter}
          items={PAYMENT_STATUS_FILTER_OPTIONS}
          onValueChange={(value) => {
            setPaymentFilter(value ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter orders by payment status" className="min-w-[200px]">
            <SelectValue>
              {PAYMENT_STATUS_FILTER_OPTIONS[paymentFilter] ?? "All Payment Statuses"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PAYMENT_STATUS_FILTER_OPTIONS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      No matching orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-semibold">
                        <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                          {order.order_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.shipping.full_name}</div>
                        <div className="text-xs text-muted-foreground">{order.shipping.email}</div>
                      </TableCell>
                      <TableCell>{order.items_count ?? "—"}</TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={order.payment_status} />
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatExactMoney(order.total_amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {canUpdateStatus && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Update Order & Payment Status"
                              aria-label={`Update status for ${order.order_number}`}
                              onClick={() => openUpdateDialog(order)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Order Details"
                            aria-label={`View ${order.order_number}`}
                            render={<Link href={`/admin/orders/${order.id}`} />}
                            nativeButton={false}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.last_page}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Quick Update Order & Payment Status Dialog */}
      <Dialog open={Boolean(editingOrder)} onOpenChange={(o) => !o && setEditingOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Status — {editingOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Update order lifecycle status and payment status. Marking payment as succeeded
              atomically deducts stock and advances pending orders to paid.
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={handleSaveStatuses} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Payment Status</Label>
              <Select
                value={draftPaymentStatus}
                items={PAYMENT_STATUS_LABELS}
                onValueChange={(value) => {
                  if (value) {
                    const nextPay = value as PaymentStatus;
                    setDraftPaymentStatus(nextPay);
                    if (
                      nextPay === "succeeded" &&
                      editingOrder?.status === "pending" &&
                      draftOrderStatus === "pending"
                    ) {
                      setDraftOrderStatus("paid");
                    } else if (
                      nextPay !== "succeeded" &&
                      editingOrder?.status === "pending" &&
                      ["paid", "processing", "shipped", "delivered"].includes(draftOrderStatus)
                    ) {
                      setDraftOrderStatus("pending");
                    }
                    setModalError(null);
                  }
                }}
              >
                <SelectTrigger aria-label="Select payment status" className="w-full">
                  <SelectValue>{PAYMENT_STATUS_LABELS[draftPaymentStatus]}</SelectValue>
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
              <Label>Order Status</Label>
              <Select
                value={draftOrderStatus}
                items={modalOrderStatusMap}
                onValueChange={(value) => {
                  if (value) {
                    setDraftOrderStatus(value as OrderStatus);
                    setModalError(null);
                  }
                }}
              >
                <SelectTrigger aria-label="Select order status" className="w-full">
                  <SelectValue>
                    {modalOrderStatusMap[draftOrderStatus] ??
                      ORDER_STATUS_LABELS[draftOrderStatus]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {modalOrderStatusItems.map((item) => (
                    <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-status-note">
                {draftOrderStatus === "cancelled"
                  ? "Cancellation Reason *"
                  : "Audit Note (Optional)"}
              </Label>
              <Input
                id="quick-status-note"
                value={draftNote}
                onChange={(e) => {
                  setDraftNote(e.target.value);
                  setModalError(null);
                }}
                placeholder={
                  draftOrderStatus === "cancelled"
                    ? "Customer requested cancellation"
                    : "e.g. Payment verified / Dispatched via courier"
                }
              />
            </div>

            {modalError && (
              <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                {modalError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingOrder(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Updating..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
