"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { formatExactMoney } from "@/lib/utils";
import { productFormSchema, stockAdjustSchema } from "@/schemas";
import type { Product } from "@/types/api";
import type { z } from "zod";

type ProductFormInput = z.input<typeof productFormSchema>;
type ProductFormValues = z.output<typeof productFormSchema>;
type StockFormInput = z.input<typeof stockAdjustSchema>;
type StockFormValues = z.output<typeof stockAdjustSchema>;

const STOCK_BADGE_CLASSES = {
  out: "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300",
  low: "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300",
  ok: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAdminAuth();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [stockNotes, setStockNotes] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: catRes } = useQuery({
    queryKey: ["admin-categories-flat"],
    queryFn: () => adminApi.getCategories(true),
  });
  const categories = catRes?.data ?? [];

  const categoryFilterOptions = useMemo(() => {
    const map: Record<string, string> = { all: "All Categories" };
    for (const c of categories) {
      map[String(c.id)] = c.parent ? `${c.parent.name} → ${c.name}` : c.name;
    }
    return map;
  }, [categories]);

  const modalCategoryOptions = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) {
      map[String(c.id)] = c.parent ? `${c.parent.name} → ${c.name}` : c.name;
    }
    return map;
  }, [categories]);

  const { data: prodRes, isLoading } = useQuery({
    queryKey: ["admin-products", debouncedSearch, categoryFilter, page],
    queryFn: () =>
      adminApi.getProducts({
        search: debouncedSearch || undefined,
        category_id: categoryFilter === "all" ? undefined : categoryFilter,
        page,
        per_page: 12,
      }),
  });
  const products = prodRes?.data ?? [];
  const meta = prodRes?.meta;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      sku: "",
      category_id: "",
      description: "",
      regular_price: "",
      discount_price: "",
      stock_quantity: 10,
      low_stock_threshold: 5,
      colors: "Black, White",
      sizes: "Small, Medium, Large, X-Large",
      is_active: true,
      is_featured: false,
      is_new_arrival: false,
      is_top_selling: false,
    },
  });

  const stockForm = useForm<StockFormInput, unknown, StockFormValues>({
    resolver: zodResolver(stockAdjustSchema),
    defaultValues: { stock_quantity: 0, low_stock_threshold: 5 },
  });

  const openCreate = () => {
    setEditing(null);
    setFiles([]);
    setFileError(null);
    reset({
      name: "",
      slug: "",
      sku: "",
      category_id: categories[0] ? String(categories[0].id) : "",
      description: "",
      regular_price: "",
      discount_price: "",
      stock_quantity: 10,
      low_stock_threshold: 5,
      colors: "Black, White",
      sizes: "Small, Medium, Large, X-Large",
      is_active: true,
      is_featured: false,
      is_new_arrival: false,
      is_top_selling: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFiles([]);
    setFileError(null);
    reset({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      category_id: String(product.category_id),
      description: product.description ?? "",
      regular_price: product.regular_price,
      discount_price: product.discount_price ?? "",
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold,
      colors: (product.colors ?? []).join(", "),
      sizes: (product.sizes ?? []).join(", "),
      is_active: product.is_active,
      is_featured: product.is_featured,
      is_new_arrival: product.is_new_arrival,
      is_top_selling: product.is_top_selling,
    });
    setDialogOpen(true);
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFileError(null);
    for (const file of selected) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setFileError(`"${file.name}" is not a valid JPG, PNG, or WebP image.`);
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        setFileError(`"${file.name}" exceeds the 4MB limit.`);
        return;
      }
    }
    setFiles(selected);
  };

  const onSubmitProduct = async (values: ProductFormValues) => {
    setFileError(null);
    try {
      const fd = new FormData();
      fd.append("name", values.name.trim());
      if (values.slug?.trim()) fd.append("slug", values.slug.trim());
      fd.append("sku", values.sku.trim());
      fd.append("category_id", String(values.category_id));
      fd.append("description", values.description ?? "");
      fd.append("regular_price", String(values.regular_price));
      if (values.discount_price !== null && values.discount_price !== undefined) {
        fd.append("discount_price", String(values.discount_price));
      }
      fd.append("stock_quantity", String(values.stock_quantity));
      fd.append("low_stock_threshold", String(values.low_stock_threshold ?? 5));
      fd.append("is_active", values.is_active ? "1" : "0");
      fd.append("is_featured", values.is_featured ? "1" : "0");
      fd.append("is_new_arrival", values.is_new_arrival ? "1" : "0");
      fd.append("is_top_selling", values.is_top_selling ? "1" : "0");

      (values.colors ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .forEach((c) => fd.append("colors[]", c));

      (values.sizes ?? "")
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
      applyApiErrorsToForm(err, setError, [
        "name",
        "slug",
        "sku",
        "category_id",
        "description",
        "regular_price",
        "discount_price",
        "stock_quantity",
        "low_stock_threshold",
      ]);
      const errObj = err as { errors?: Record<string, string[]> };
      const imgErr = errObj?.errors?.images?.[0] || errObj?.errors?.["images.0"]?.[0];
      if (imgErr) setFileError(imgErr);
      toast.error(getApiErrorMessage(err, "Failed to save product."));
    }
  };

  const handleDeleteImage = async (productId: number, imageId: number) => {
    try {
      const res = await adminApi.deleteProductImage(productId, imageId);
      setEditing(res.data);
      toast.success("Image deleted.");
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete image."));
    }
  };

  const openStockDialog = (product: Product) => {
    setStockTarget(product);
    setStockNotes("");
    stockForm.reset({
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold,
    });
  };

  const onSubmitStock = async (values: StockFormValues) => {
    if (!stockTarget) return;
    try {
      await adminApi.updateStock(
        stockTarget.id,
        values.stock_quantity,
        stockNotes.trim() || undefined,
      );
      toast.success("Stock updated.");
      setStockTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      applyApiErrorsToForm(err, stockForm.setError, ["stock_quantity"]);
      toast.error(getApiErrorMessage(err, "Failed to update stock."));
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
      toast.error(getApiErrorMessage(err, "Failed to delete product."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
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
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, SKU, slug..."
            className="pl-9 h-9"
          />
        </div>
        <Select
          value={categoryFilter}
          items={categoryFilterOptions}
          onValueChange={(value) => {
            setCategoryFilter(value ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by category" className="h-9 min-w-[210px]">
            <SelectValue>{categoryFilterOptions[categoryFilter] ?? "All Categories"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryFilterOptions).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const stockState =
                      product.stock_quantity === 0
                        ? "out"
                        : product.stock_quantity <= product.low_stock_threshold
                          ? "low"
                          : "ok";
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={product.primary_image_url || "/images/style-casual.jpg"}
                              alt={product.name}
                              className="h-11 w-11 rounded-lg bg-muted object-cover border border-border"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold truncate max-w-[220px]">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.slug}</p>
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
                            <div className="text-xs text-muted-foreground line-through">
                              {formatExactMoney(product.regular_price)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STOCK_BADGE_CLASSES[stockState]}>
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
                                aria-label="Update Stock"
                                onClick={() => openStockDialog(product)}
                              >
                                <Boxes className="h-4 w-4" />
                              </Button>
                            )}
                            {hasPermission("products.edit") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit Product"
                                aria-label="Edit Product"
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
                                aria-label="Delete Product"
                                onClick={() => setDeleteTarget(product)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
          <span className="text-xs text-muted-foreground">
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Create Product"}</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSubmit(onSubmitProduct)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prod-name">Product Name *</Label>
                <Input
                  id="prod-name"
                  aria-invalid={Boolean(errors.name)}
                  {...register("name")}
                />
                {errors.name && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-sku">SKU (Unique) *</Label>
                <Input
                  id="prod-sku"
                  aria-invalid={Boolean(errors.sku)}
                  {...register("sku")}
                />
                {errors.sku && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.sku.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-slug">Slug (auto if blank)</Label>
                <Input
                  id="prod-slug"
                  aria-invalid={Boolean(errors.slug)}
                  {...register("slug")}
                />
                {errors.slug && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.slug.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Controller
                  name="category_id"
                  control={control}
                  render={({ field }) => {
                    const currentVal = field.value ? String(field.value) : "";
                    return (
                      <Select
                        value={currentVal}
                        items={modalCategoryOptions}
                        onValueChange={(val) => field.onChange(val ?? "")}
                      >
                        <SelectTrigger
                          aria-invalid={Boolean(errors.category_id)}
                          className="w-full h-9"
                        >
                          <SelectValue placeholder="Select category">
                            {currentVal
                              ? (modalCategoryOptions[currentVal] ?? "Select category")
                              : "Select category"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(modalCategoryOptions).map(([val, label]) => (
                            <SelectItem key={val} value={val}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
                {errors.category_id && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.category_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-price">Regular Price ($) *</Label>
                <Input
                  id="prod-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  aria-invalid={Boolean(errors.regular_price)}
                  {...register("regular_price")}
                />
                {errors.regular_price && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.regular_price.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-discount">Discount Price ($)</Label>
                <Input
                  id="prod-discount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  aria-invalid={Boolean(errors.discount_price)}
                  {...register("discount_price")}
                />
                {errors.discount_price && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.discount_price.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-stock">Stock Quantity *</Label>
                <Input
                  id="prod-stock"
                  type="number"
                  min="0"
                  aria-invalid={Boolean(errors.stock_quantity)}
                  {...register("stock_quantity")}
                />
                {errors.stock_quantity && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.stock_quantity.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-threshold">Low-Stock Threshold</Label>
                <Input
                  id="prod-threshold"
                  type="number"
                  min="0"
                  aria-invalid={Boolean(errors.low_stock_threshold)}
                  {...register("low_stock_threshold")}
                />
                {errors.low_stock_threshold && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.low_stock_threshold.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-colors">Colors (comma-separated)</Label>
                <Input id="prod-colors" {...register("colors")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-sizes">Sizes (comma-separated)</Label>
                <Input id="prod-sizes" {...register("sizes")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prod-desc">Description</Label>
              <Textarea
                id="prod-desc"
                aria-invalid={Boolean(errors.description)}
                {...register("description")}
              />
              {errors.description && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.description.message}
                </p>
              )}
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
                <Controller
                  key={key}
                  name={key}
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch
                        checked={Boolean(field.value)}
                        onCheckedChange={(v) => field.onChange(v)}
                      />
                      {label}
                    </label>
                  )}
                />
              ))}
            </div>

            {/* Existing Images (when editing) */}
            {editing && editing.images && editing.images.length > 0 && (
              <div className="space-y-2">
                <Label>Current Images</Label>
                <div className="flex flex-wrap gap-3">
                  {editing.images.map((img) => (
                    <div
                      key={img.id}
                      className="relative h-20 w-20 rounded-lg overflow-hidden border border-border"
                    >
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(editing.id, img.id)}
                        className="absolute right-1 top-1 rounded-full bg-black/75 p-0.5 text-white hover:bg-black cursor-pointer"
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
              <Label htmlFor="prod-images" className="inline-flex items-center gap-1.5">
                <Upload className="h-4 w-4" /> Upload Product Images (JPG/PNG/WebP, max 4MB each)
              </Label>
              <Input
                id="prod-images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFilesChange}
              />
              {files.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {files.length} image(s) queued for upload.
                </p>
              )}
              {fileError && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {fileError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editing ? "Update Product" : "Create Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Stock Adjustment Dialog */}
      <Dialog open={Boolean(stockTarget)} onOpenChange={(o) => !o && setStockTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Stock — {stockTarget?.name}</DialogTitle>
          </DialogHeader>
          <form
            noValidate
            onSubmit={stockForm.handleSubmit(onSubmitStock)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="quick-stock-qty">New Stock Quantity *</Label>
              <Input
                id="quick-stock-qty"
                type="number"
                min="0"
                aria-invalid={Boolean(stockForm.formState.errors.stock_quantity)}
                {...stockForm.register("stock_quantity")}
              />
              {stockForm.formState.errors.stock_quantity && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {stockForm.formState.errors.stock_quantity.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-stock-note">Audit Note</Label>
              <Input
                id="quick-stock-note"
                value={stockNotes}
                onChange={(e) => setStockNotes(e.target.value)}
                placeholder="Restock shipment / inventory count"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStockTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={stockForm.formState.isSubmitting}>
                {stockForm.formState.isSubmitting ? "Saving..." : "Save Stock"}
              </Button>
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
