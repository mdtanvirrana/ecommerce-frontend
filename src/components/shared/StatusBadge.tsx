import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ORDER_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-transparent",
  paid: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-transparent",
  processing: "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-transparent",
  shipped: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent",
  delivered: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-transparent",
  cancelled: "bg-red-500/15 text-red-700 dark:bg-red-500/25 dark:text-red-300 border-transparent",
};

const PAYMENT_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-transparent",
  succeeded: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-transparent",
  failed: "bg-red-500/15 text-red-700 dark:bg-red-500/25 dark:text-red-300 border-transparent",
  cancelled: "bg-zinc-500/15 text-zinc-700 dark:bg-zinc-500/25 dark:text-zinc-300 border-transparent",
  refunded: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-transparent",
  needs_resolution: "bg-red-600/20 text-red-700 dark:bg-red-500/30 dark:text-red-200 border-transparent",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", ORDER_STYLES[status])}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", PAYMENT_STYLES[status])}>
      {status.replace("_", " ")}
    </Badge>
  );
}
