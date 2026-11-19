import React from "react";
import { Badge } from "@/components/ui/badge";

const ORDER_VARIANT_MAP: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "info"> = {
  pending: "warning",
  paid: "info",
  processing: "info",
  shipped: "default",
  delivered: "success",
  cancelled: "destructive",
};

const PAYMENT_VARIANT_MAP: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "info"> = {
  pending: "warning",
  succeeded: "success",
  failed: "destructive",
  cancelled: "secondary",
  refunded: "info",
  needs_resolution: "destructive",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={ORDER_VARIANT_MAP[status] ?? "secondary"} className="capitalize">
      {status.replace("_", " ")}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={PAYMENT_VARIANT_MAP[status] ?? "secondary"} className="capitalize">
      {status.replace("_", " ")}
    </Badge>
  );
}
