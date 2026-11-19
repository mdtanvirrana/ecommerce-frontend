"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { adminApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customer", params.id],
    queryFn: () => adminApi.getCustomer(params.id),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const payload = data?.data;
  if (!payload) {
    return <Card className="p-8 text-center">Customer not found.</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Back to customers"
          render={<Link href="/admin/customers" />}
          nativeButton={false}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{payload.customer.name}</h1>
          <p className="text-sm text-muted-foreground">{payload.customer.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{payload.total_orders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Verified Spending</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatExactMoney(payload.total_spending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Phone / Joined</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{payload.customer.phone || "No phone"}</p>
            <p className="text-xs text-muted-foreground">
              Joined {formatDate(payload.customer.created_at)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payload.orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No orders placed by this customer yet.
                  </TableCell>
                </TableRow>
              ) : (
                payload.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-semibold">
                      <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={order.payment_status} />
                    </TableCell>
                    <TableCell>{order.items_count ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatExactMoney(order.total_amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
