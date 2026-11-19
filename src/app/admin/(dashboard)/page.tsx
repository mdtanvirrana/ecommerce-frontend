"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  DollarSign,
  ShoppingBag,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminApi } from "@/services/api";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatExactMoney } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { hasPermission } = useAdminAuth();
  const canViewReports = hasPermission("reports.view");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard(),
    enabled: canViewReports,
  });

  if (!canViewReports) {
    return (
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold">Welcome to SHOP.CO Admin</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-zinc-400">
          Use the navigation sidebar to access modules assigned to your role.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <Card className="p-8 text-center text-[#FF3333]">
        Failed to load dashboard analytics from the database.
      </Card>
    );
  }

  const { stats, sales_chart, recent_orders, low_stock_items } = data.data;

  const kpis = [
    {
      label: "Today's Orders",
      value: String(stats.today_orders),
      sub: `${stats.total_orders} total orders`,
      icon: ShoppingBag,
    },
    {
      label: "Today's Revenue",
      value: formatExactMoney(stats.today_revenue),
      sub: `${formatExactMoney(stats.total_revenue)} lifetime revenue`,
      icon: DollarSign,
    },
    {
      label: "Total Customers",
      value: String(stats.total_customers),
      sub: "Registered customer accounts",
      icon: Users,
    },
    {
      label: "Low-Stock Products",
      value: String(stats.low_stock_products),
      sub: "At or below stock threshold",
      icon: AlertTriangle,
      warn: stats.low_stock_products > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-black/60 dark:text-zinc-400">
          Live store performance computed directly from MySQL records.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="font-medium">{kpi.label}</CardDescription>
                <Icon
                  className={
                    kpi.warn
                      ? "h-5 w-5 text-amber-500"
                      : "h-5 w-5 text-black/50 dark:text-zinc-400"
                  }
                />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="mt-1 text-xs text-black/55 dark:text-zinc-400">{kpi.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 30-Day Sales Chart (Recharts) + Low Stock Panel */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader>
            <CardTitle>30-Day Sales Revenue</CardTitle>
            <CardDescription>Daily verified paid revenue over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sales_chart} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value) => [formatExactMoney(Number(value)), "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#18181b"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Low-Stock Alerts</CardTitle>
            <CardDescription>Active items needing replenishment</CardDescription>
          </CardHeader>
          <CardContent>
            {low_stock_items.length === 0 ? (
              <p className="py-8 text-center text-sm text-black/50 dark:text-zinc-400">
                All active products have healthy stock levels.
              </p>
            ) : (
              <div className="divide-y divide-black/8 dark:divide-zinc-800">
                {low_stock_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                    <div className="min-w-0 pr-3">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-black/55 dark:text-zinc-400">{item.sku}</p>
                    </div>
                    <span
                      className={
                        item.stock_quantity === 0
                          ? "rounded-full bg-[#FF3333]/10 px-2.5 py-0.5 text-xs font-bold text-[#FF3333]"
                          : "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400"
                      }
                    >
                      {item.stock_quantity} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest customer orders across all statuses</CardDescription>
          </div>
          {hasPermission("orders.view") && (
            <Link href="/admin/orders" className="text-xs font-medium underline">
              View All Orders
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent_orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-black/50">
                    No orders recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                recent_orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-semibold">
                      <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.shipping.full_name}</div>
                      <div className="text-xs text-black/55 dark:text-zinc-400">
                        {order.shipping.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={order.payment_status} />
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(order.created_at)}</TableCell>
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
