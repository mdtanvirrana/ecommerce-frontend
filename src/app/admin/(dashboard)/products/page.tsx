"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Edit, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/services/api";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/apiClient";
import { formatExactMoney } from "@/lib/utils";
import type { Product } from "@/types/api";

interface ProductFormState {
  name: string;
  slug: string;
  sku: string;
  category_id: string;
  description: string;
  regular_price: string;
  discount_price: string;
  stock_quantity: string;
  low_stock_threshold: string;
  colors: string;
  sizes: string;
  is_active: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_top_selling: boolean;
}

const DEFAULT_FORM: ProductFormState = {
  name: "",
  slug: "",
  sku: "",
  category_id: "",
  description: "",
  regular_price: "",
  discount_price: "",
  stock_quantity: "10",
  low_stock_threshold: "5",
  colors: "Black, White",
  sizes: "Small, Medium, Large, X-Large",
  is_active: true,
  is_featured: false,
  is_new_arrival: false,
  is_top_selling: false,
};

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAdminAuth();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(DEFAULT_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [stockVal, setStockVal] = useState("0");
  const [stockNotes, setStockNotes] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: catRes } = useQuery({
    queryKey: ["admin-categories-flat"],
    queryFn: () => adminApi.getCategories(true),
  });
  const categories = catRes?.data ?? [];

  const { data: prodRes, isLoading } = useQuery({
    queryKey: ["admin-products", debouncedSearch, categoryFilter, page],
    queryFn: () =>
      adminApi.getProducts({
        search: debouncedSearch || undefined,
        category_id: categoryFilter || undefined,
        page,
        per_page: 12,
      }),
  });
  const products = prodRes?.data ?? [];
  const meta = prodRes?.meta;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...DEFAULT_FORM, category_id: categories[0] ? String(categories[0].id) : "" });
    setFiles([]);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      category_id: String(product.category_id),
      description: product.description ?? "",
      regular_price: product.regular_price,
      discount_price: product.discount_price ?? "",
      stock_quantity: String(product.stock_quantity),
      low_stock_threshold: String(product.low_stock_threshold),
      colors: (product.colors ?? []).join(", "),
      sizes: (product.sizes ?? []).join(", "),
      is_active: product.is_active,
      is_featured: product.is_featured,
      is_new_arrival: product.is_new_arrival,
      is_top_selling: product.is_top_selling,
    });
    setFiles([]);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      if (form.slug.trim()) fd.append("slug", form.slug.trim());
      fd.append("sku", form.sku.trim());
      fd.append("category_id", form.category_id);
      fd.append("description", form.description);
      fd.append("regular_price", form.regular_price);
      if (form.discount_price.trim() !== "") {
        fd.append("discount_price", form.discount_price.trim());
      }
      fd.append("stock_quantity", form.stock_quantity);
      fd.append("low_stock_threshold", form.low_stock_threshold || "5");
      fd.append("is_active", form.is_active ? "1" : "0");
      fd.append("is_featured", form.is_featured ? "1" : "0");
      fd.append("is_new_arrival", form.is_new_arrival ? "1" : "0");
      fd.append("is_top_selling", form.is_top_selling ? "1" : "0");

      form.colors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .forEach((c) => fd.append("colors[]", c));

      form.sizes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => fd.append("sizes[]", s));

      files.forEach((file) => fd.append("images[]", file));

      if (editing) {
        await adminApi.updateProduct(editing.id, fd);
        toast.success("Product updated successfully.");
      } else {
        await adminApi.createProduct(fd);
        toast.success("Product created successfully.");
      }

      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (productId: number, imageId: number) => {
    try {
      const res = await adminApi.deleteProductImage(productId, imageId);
      setEditing(res.data);
      toast.success("Image deleted.");
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete image.");
    }
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockTarget) return;
    try {
      await adminApi.updateStock(stockTarget.id, Number(stockVal), stockNotes || undefined);
      toast.success("Stock updated.");
      setStockTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update stock.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteProduct(deleteTarget.id);
      toast.success("Product deleted.");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete product.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-black/60 dark:text-zinc-400">
            Manage catalog pricing, inventory stock, SKUs, and product galleries.
          </p>
        </div>
        {hasPermission("products.create") && (
          <Button onClick={openCreate} className="rounded-full">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, SKU, slug..."
            className="pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-black/15 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.parent ? `${c.parent.name} → ${c.name}` : c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-black/50">
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={product.primary_image_url || "/images/style-casual.jpg"}
                            alt={product.name}
                            className="h-11 w-11 rounded-lg bg-[#F0EEED] object-cover"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold truncate max-w-[220px]">{product.name}</p>
                            <p className="text-xs text-black/50 dark:text-zinc-400">
                              {product.slug}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                      <TableCell className="text-xs">{product.category?.name ?? "—"}</TableCell>
                      <TableCell>
                        <div className="font-semibold">
                          {formatExactMoney(product.effective_price)}
                        </div>
                        {product.discount_price && (
                          <div className="text-xs text-black/45 line-through">
                            {formatExactMoney(product.regular_price)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.stock_quantity === 0
                              ? "destructive"
                              : product.stock_quantity <= product.low_stock_threshold
                                ? "warning"
                                : "success"
                          }
                        >
                          {product.stock_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {hasPermission("products.update_stock") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Update Stock"
                              onClick={() => {
                                setStockTarget(product);
                                setStockVal(String(product.stock_quantity));
                                setStockNotes("");
                              }}
                            >
                              <Boxes className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission("products.edit") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit Product"
                              onClick={() => openEdit(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission("products.delete") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Product"
                              onClick={() => setDeleteTarget(product)}
                            >
                              <Trash2 className="h-4 w-4 text-[#FF3333]" />
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

      {/* Pagination */}
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
          <span className="text-xs text-black/60 dark:text-zinc-400">
            Page {meta.current_page} of {meta.last_page} ({meta.total} products)
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

      {/* Create/Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Create Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Product Name *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>SKU (Unique) *</Label>
                <Input
                  required
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug (auto if blank)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <select
                  required
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent ? `${c.parent.name} → ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Regular Price ($) *</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.regular_price}
                  onChange={(e) => setForm({ ...form, regular_price: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Discount Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.discount_price}
                  onChange={(e) => setForm({ ...form, discount_price: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stock Quantity *</Label>
                <Input
                  required
                  type="number"
                  min="0"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Low-Stock Threshold</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.low_stock_threshold}
                  onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Colors (comma-separated)</Label>
                <Input
                  value={form.colors}
                  onChange={(e) => setForm({ ...form, colors: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sizes (comma-separated)</Label>
                <Input
                  value={form.sizes}
                  onChange={(e) => setForm({ ...form, sizes: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="flex flex-wrap gap-5 pt-1">
              {(
                [
                  ["is_active", "Active"],
                  ["is_featured", "Featured"],
                  ["is_new_arrival", "New Arrival"],
                  ["is_top_selling", "Top Selling"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch
                    checked={form[key]}
                    onCheckedChange={(v) => setForm({ ...form, [key]: v })}
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Existing Images (when editing) */}
            {editing && editing.images && editing.images.length > 0 && (
              <div className="space-y-2">
                <Label>Current Images</Label>
                <div className="flex flex-wrap gap-3">
                  {editing.images.map((img) => (
                    <div key={img.id} className="relative h-20 w-20 rounded-lg overflow-hidden border">
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(editing.id, img.id)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multiple Image Upload */}
            <div className="space-y-1.5">
              <Label className="inline-flex items-center gap-1.5">
                <Upload className="h-4 w-4" /> Upload Product Images (JPG/PNG/WebP, max 4MB each)
              </Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              {files.length > 0 && (
                <p className="text-xs text-black/60">{files.length} image(s) queued for upload.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Update Product" : "Create Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Stock Adjustment Dialog */}
      <Dialog open={Boolean(stockTarget)} onOpenChange={(o) => !o && setStockTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Stock — {stockTarget?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStock} className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Stock Quantity</Label>
              <Input
                type="number"
                min="0"
                required
                value={stockVal}
                onChange={(e) => setStockVal(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Audit Note</Label>
              <Input
                value={stockNotes}
                onChange={(e) => setStockNotes(e.target.value)}
                placeholder="Restock shipment / inventory count"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStockTarget(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Stock</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Product?"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
