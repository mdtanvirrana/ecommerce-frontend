"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, Search } from "lucide-react";
import { adminApi } from "@/services/api";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { formatDate, formatExactMoney } from "@/lib/utils";

const ORDER_STATUS_OPTIONS: Record<string, string> = {
  all: "All Statuses",
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", debouncedSearch, status, page],
    queryFn: () =>
      adminApi.getOrders({
        search: debouncedSearch || undefined,
        status: status === "all" ? undefined : status,
        page,
        per_page: 15,
      }),
  });

  const orders = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Inspect verified payments, fulfill orders, and manage cancellations.
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
          <SelectTrigger aria-label="Filter orders by status" className="min-w-[175px]">
            <SelectValue>{ORDER_STATUS_OPTIONS[status] ?? "All Statuses"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ORDER_STATUS_OPTIONS).map(([val, label]) => (
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
                  <TableHead className="text-right">View</TableHead>
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
                      <TableCell className="font-semibold">{order.order_number}</TableCell>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="View order"
                          render={<Link href={`/admin/orders/${order.id}`} />}
                          nativeButton={false}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
    </div>
  );
}
