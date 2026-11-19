"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/services/api";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
import { formatDate, formatExactMoney } from "@/lib/utils";
import { couponFormSchema } from "@/schemas";
import type { Coupon } from "@/types/api";
import type { z } from "zod";

type CouponFormInput = z.input<typeof couponFormSchema>;
type CouponFormValues = z.output<typeof couponFormSchema>;

const COUPON_TYPE_OPTIONS: Record<string, string> = {
  percentage: "Percentage (%)",
  fixed: "Fixed Amount ($)",
};

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const { hasAnyPermission } = useAdminAuth();

  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-coupons", debounced],
    queryFn: () => adminApi.getCoupons({ search: debounced || undefined, per_page: 50 }),
  });
  const coupons = data?.data ?? [];

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CouponFormInput, unknown, CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: "",
      type: "percentage",
      value: 15,
      minimum_order_amount: 50,
      maximum_discount_amount: "",
      usage_limit: "",
      per_customer_usage_limit: "",
      starts_at: "",
      expires_at: "",
      is_active: true,
    },
  });

  const openCreate = () => {
    setEditing(null);
    reset({
      code: "",
      type: "percentage",
      value: 15,
      minimum_order_amount: 50,
      maximum_discount_amount: 100,
      usage_limit: 100,
      per_customer_usage_limit: 1,
      starts_at: "",
      expires_at: "",
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    reset({
      code: c.code,
      type: c.type,
      value: c.value,
      minimum_order_amount: c.minimum_order_amount,
      maximum_discount_amount: c.maximum_discount_amount ?? "",
      usage_limit: c.usage_limit !== null ? c.usage_limit : "",
      per_customer_usage_limit:
        c.per_customer_usage_limit !== null ? c.per_customer_usage_limit : "",
      starts_at: c.starts_at ? c.starts_at.slice(0, 16) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
      is_active: c.is_active,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: CouponFormValues) => {
    try {
      const payload = {
        code: values.code.trim().toUpperCase(),
        type: values.type,
        value: values.value,
        minimum_order_amount: values.minimum_order_amount ?? 0,
        maximum_discount_amount: values.maximum_discount_amount ?? null,
        usage_limit: values.usage_limit ?? null,
        per_customer_usage_limit: values.per_customer_usage_limit ?? null,
        starts_at: values.starts_at || null,
        expires_at: values.expires_at || null,
        is_active: values.is_active,
      };
      if (editing) {
        await adminApi.updateCoupon(editing.id, payload);
        toast.success("Coupon updated.");
      } else {
        await adminApi.createCoupon(payload);
        toast.success("Coupon created.");
      }
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch (err) {
      applyApiErrorsToForm(err, setError, [
        "code",
        "type",
        "value",
        "minimum_order_amount",
        "maximum_discount_amount",
        "usage_limit",
        "per_customer_usage_limit",
        "starts_at",
        "expires_at",
      ]);
      toast.error(getApiErrorMessage(err, "Failed to save coupon."));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteCoupon(deleteTarget.id);
      toast.success("Coupon deleted.");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete coupon."));
    } finally {
      setDeleting(false);
    }
  };

  const canCreate = hasAnyPermission(["coupons.create", "coupons.manage"]);
  const canEdit = hasAnyPermission(["coupons.edit", "coupons.manage"]);
  const canDelete = hasAnyPermission(["coupons.delete", "coupons.manage"]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Coupons</h1>
          <p className="text-sm text-muted-foreground">
            Configure percentage and fixed discount codes validated strictly on Laravel.
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="rounded-full">
            <Plus className="h-4 w-4" /> Create Coupon
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search coupon code..."
          className="pl-10"
        />
      </div>

      <Card className="py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No coupons found.
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-bold">{c.code}</TableCell>
                      <TableCell>
                        {c.type === "percentage" ? `${c.value}%` : formatExactMoney(c.value)}
                        {c.maximum_discount_amount && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (max {formatExactMoney(c.maximum_discount_amount)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatExactMoney(c.minimum_order_amount)}</TableCell>
                      <TableCell className="text-xs">
                        {c.used_count} / {c.usage_limit ?? "∞"}
                        {c.per_customer_usage_limit && ` (${c.per_customer_usage_limit}/cust)`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(c.starts_at)} → {formatDate(c.expires_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={c.is_active ? "outline" : "secondary"}
                          className={
                            c.is_active
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : ""
                          }
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${c.code}`}
                              onClick={() => openEdit(c)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${c.code}`}
                              onClick={() => setDeleteTarget(c)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </Button>
                          )}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.code}` : "Create Coupon"}</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="coupon-code">Code *</Label>
                <Input
                  id="coupon-code"
                  placeholder="SUMMER20"
                  className="uppercase"
                  aria-invalid={Boolean(errors.code)}
                  {...register("code")}
                />
                {errors.code && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      items={COUPON_TYPE_OPTIONS}
                      onValueChange={(val) => {
                        if (val === "percentage" || val === "fixed") {
                          field.onChange(val);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>{COUPON_TYPE_OPTIONS[field.value]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(COUPON_TYPE_OPTIONS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.type.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-value">Discount Value *</Label>
                <Input
                  id="coupon-value"
                  type="number"
                  step="0.01"
                  min="0.01"
                  aria-invalid={Boolean(errors.value)}
                  {...register("value")}
                />
                {errors.value && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.value.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-min">Minimum Order Amount ($)</Label>
                <Input
                  id="coupon-min"
                  type="number"
                  step="0.01"
                  min="0"
                  aria-invalid={Boolean(errors.minimum_order_amount)}
                  {...register("minimum_order_amount")}
                />
                {errors.minimum_order_amount && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.minimum_order_amount.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-max">Max Discount ($ optional)</Label>
                <Input
                  id="coupon-max"
                  type="number"
                  step="0.01"
                  min="0.01"
                  aria-invalid={Boolean(errors.maximum_discount_amount)}
                  {...register("maximum_discount_amount")}
                />
                {errors.maximum_discount_amount && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.maximum_discount_amount.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-usage">Total Usage Limit</Label>
                <Input
                  id="coupon-usage"
                  type="number"
                  min="1"
                  aria-invalid={Boolean(errors.usage_limit)}
                  {...register("usage_limit")}
                />
                {errors.usage_limit && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.usage_limit.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-per-cust">Per-Customer Limit</Label>
                <Input
                  id="coupon-per-cust"
                  type="number"
                  min="1"
                  aria-invalid={Boolean(errors.per_customer_usage_limit)}
                  {...register("per_customer_usage_limit")}
                />
                {errors.per_customer_usage_limit && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.per_customer_usage_limit.message}
                  </p>
                )}
              </div>

              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 pt-6 text-sm cursor-pointer">
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                    Active
                  </label>
                )}
              />

              <div className="space-y-1.5">
                <Label htmlFor="coupon-starts">Start Date</Label>
                <Input
                  id="coupon-starts"
                  type="datetime-local"
                  aria-invalid={Boolean(errors.starts_at)}
                  {...register("starts_at")}
                />
                {errors.starts_at && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.starts_at.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-expires">Expiration Date</Label>
                <Input
                  id="coupon-expires"
                  type="datetime-local"
                  aria-invalid={Boolean(errors.expires_at)}
                  {...register("expires_at")}
                />
                {errors.expires_at && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.expires_at.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Coupon"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Coupon?"
        description={`Delete coupon "${deleteTarget?.code}"?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
