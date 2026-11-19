"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/apiClient";
import { formatDate, formatExactMoney } from "@/lib/utils";
import type { Coupon } from "@/types/api";

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const { hasAnyPermission } = useAdminAuth();

  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [perCustomerLimit, setPerCustomerLimit] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-coupons", debounced],
    queryFn: () => adminApi.getCoupons({ search: debounced || undefined, per_page: 50 }),
  });
  const coupons = data?.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setCode("");
    setType("percentage");
    setValue("15");
    setMinOrder("50");
    setMaxDiscount("100");
    setUsageLimit("100");
    setPerCustomerLimit("1");
    setStartsAt("");
    setExpiresAt("");
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setCode(c.code);
    setType(c.type);
    setValue(c.value);
    setMinOrder(c.minimum_order_amount);
    setMaxDiscount(c.maximum_discount_amount ?? "");
    setUsageLimit(c.usage_limit !== null ? String(c.usage_limit) : "");
    setPerCustomerLimit(c.per_customer_usage_limit !== null ? String(c.per_customer_usage_limit) : "");
    setStartsAt(c.starts_at ? c.starts_at.slice(0, 16) : "");
    setExpiresAt(c.expires_at ? c.expires_at.slice(0, 16) : "");
    setIsActive(c.is_active);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        minimum_order_amount: Number(minOrder) || 0,
        maximum_discount_amount: maxDiscount ? Number(maxDiscount) : null,
        usage_limit: usageLimit ? Number(usageLimit) : null,
        per_customer_usage_limit: perCustomerLimit ? Number(perCustomerLimit) : null,
        starts_at: startsAt || null,
        expires_at: expiresAt || null,
        is_active: isActive,
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
      toast.error(err instanceof ApiError ? err.message : "Failed to save coupon.");
    } finally {
      setSaving(false);
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
      toast.error(err instanceof ApiError ? err.message : "Failed to delete coupon.");
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
          <p className="text-sm text-black/60 dark:text-zinc-400">
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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search coupon code..."
          className="pl-9"
        />
      </div>

      <Card>
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
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-bold">{c.code}</TableCell>
                    <TableCell>
                      {c.type === "percentage" ? `${c.value}%` : formatExactMoney(c.value)}
                      {c.maximum_discount_amount && (
                        <span className="ml-1 text-xs text-black/50">
                          (max {formatExactMoney(c.maximum_discount_amount)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatExactMoney(c.minimum_order_amount)}</TableCell>
                    <TableCell className="text-xs">
                      {c.used_count} / {c.usage_limit ?? "∞"}
                      {c.per_customer_usage_limit && ` (${c.per_customer_usage_limit}/cust)`}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(c.starts_at)} → {formatDate(c.expires_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? "success" : "secondary"}>
                        {c.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)}>
                            <Trash2 className="h-4 w-4 text-[#FF3333]" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.code}` : "Create Coupon"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SUMMER20"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "percentage" | "fixed")}
                  className="h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Discount Value *</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Minimum Order Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max Discount ($ optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Total Usage Limit</Label>
                <Input
                  type="number"
                  min="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Per-Customer Limit</Label>
                <Input
                  type="number"
                  min="1"
                  value={perCustomerLimit}
                  onChange={(e) => setPerCustomerLimit(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expiration Date</Label>
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Coupon"}
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
