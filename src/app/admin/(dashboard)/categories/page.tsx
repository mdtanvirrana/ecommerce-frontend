"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, FolderTree, ImageIcon, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/services/api";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
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
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
import { categoryFormSchema } from "@/schemas";
import type { Category } from "@/types/api";
import type { z } from "zod";

type CategoryFormInput = z.input<typeof categoryFormSchema>;
type CategoryFormValues = z.output<typeof categoryFormSchema>;

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAdminAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: treeRes, isLoading } = useQuery({
    queryKey: ["admin-categories-tree"],
    queryFn: () => adminApi.getCategories(false),
  });
  const tree = treeRes?.data ?? [];

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormInput, unknown, CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      parent_id: "none",
      description: "",
      sort_order: 0,
      is_active: true,
    },
  });

  const parentOptions = useMemo(() => {
    const map: Record<string, string> = { none: "None (Top-Level Category)" };
    for (const p of tree) {
      if (!editing || p.id !== editing.id) {
        map[String(p.id)] = p.name;
      }
    }
    return map;
  }, [tree, editing]);

  const clearImageSelection = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
  };

  const openCreate = (defaultParentId?: number) => {
    setEditing(null);
    clearImageSelection();
    setRemoveExistingImage(false);
    reset({
      name: "",
      slug: "",
      parent_id: defaultParentId ? String(defaultParentId) : "none",
      description: "",
      sort_order: 0,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    clearImageSelection();
    setRemoveExistingImage(false);
    reset({
      name: cat.name,
      slug: cat.slug,
      parent_id: cat.parent_id ? String(cat.parent_id) : "none",
      description: cat.description ?? "",
      sort_order: cat.sort_order,
      is_active: cat.is_active,
    });
    setDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageError(null);
    if (!file) {
      clearImageSelection();
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setImageError("Image size must be 4MB or less.");
      return;
    }
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveExistingImage(false);
  };

  const onSubmit = async (values: CategoryFormValues) => {
    setImageError(null);
    try {
      const fd = new FormData();
      fd.append("name", values.name.trim());
      if (values.slug?.trim()) fd.append("slug", values.slug.trim());
      if (values.parent_id !== null && values.parent_id !== undefined) {
        fd.append("parent_id", String(values.parent_id));
      } else {
        fd.append("parent_id", "");
      }
      fd.append("description", values.description?.trim() ?? "");
      fd.append("sort_order", String(values.sort_order ?? 0));
      fd.append("is_active", values.is_active ? "1" : "0");

      if (imageFile) {
        fd.append("image", imageFile);
      } else if (editing && removeExistingImage) {
        fd.append("remove_image", "1");
      }

      if (editing) {
        await adminApi.updateCategory(editing.id, fd);
        toast.success("Category updated.");
      } else {
        await adminApi.createCategory(fd);
        toast.success("Category created.");
      }
      setDialogOpen(false);
      clearImageSelection();
      await queryClient.invalidateQueries({ queryKey: ["admin-categories-tree"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-categories-flat"] });
      await queryClient.invalidateQueries({ queryKey: ["storefront-categories"] });
    } catch (err) {
      applyApiErrorsToForm(err, setError, [
        "name",
        "slug",
        "parent_id",
        "description",
        "sort_order",
      ]);
      const errObj = err as { errors?: Record<string, string[]> };
      if (errObj?.errors?.image?.[0]) {
        setImageError(errObj.errors.image[0]);
      }
      toast.error(getApiErrorMessage(err, "Failed to save category."));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteCategory(deleteTarget.id);
      toast.success("Category deleted.");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-categories-tree"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-categories-flat"] });
      await queryClient.invalidateQueries({ queryKey: ["storefront-categories"] });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Cannot delete category."));
    } finally {
      setDeleting(false);
    }
  };

  const displayedPreview = imagePreview || (!removeExistingImage ? editing?.image_url : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Two-level parent/child category hierarchy with homepage dress-style images and circular
            relationship protection.
          </p>
        </div>
        {hasPermission("categories.create") && (
          <Button onClick={() => openCreate()} className="rounded-full">
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {tree.map((parent) => (
            <Card key={parent.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {parent.image_url ? (
                      <img
                        src={parent.image_url}
                        alt={parent.name}
                        className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover bg-muted"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                        <FolderTree className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold">{parent.name}</h2>
                        <Badge variant={parent.is_active ? "default" : "secondary"}>
                          {parent.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">/{parent.slug}</span>
                      </div>
                      {parent.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{parent.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasPermission("categories.create") && (
                      <Button variant="outline" size="sm" onClick={() => openCreate(parent.id)}>
                        <Plus className="h-3.5 w-3.5" /> Subcategory
                      </Button>
                    )}
                    {hasPermission("categories.edit") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${parent.name}`}
                        onClick={() => openEdit(parent)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission("categories.delete") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${parent.name}`}
                        onClick={() => setDeleteTarget(parent)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>

                {parent.children && parent.children.length > 0 && (
                  <div className="mt-4 ml-4 border-l-2 border-border pl-4 space-y-2">
                    {parent.children.map((child) => (
                      <div
                        key={child.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5 text-sm">
                          {child.image_url && (
                            <img
                              src={child.image_url}
                              alt={child.name}
                              className="h-8 w-8 rounded-md border border-border object-cover"
                            />
                          )}
                          <span className="font-medium">{child.name}</span>
                          <span className="text-xs text-muted-foreground">/{child.slug}</span>
                          <Badge variant="outline" className="text-[11px]">
                            {child.products_count ?? 0} products
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {hasPermission("categories.edit") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${child.name}`}
                              onClick={() => openEdit(child)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {hasPermission("categories.delete") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${child.name}`}
                              onClick={() => setDeleteTarget(child)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Create Category"}</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name *</Label>
              <Input
                id="cat-name"
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
              <Label htmlFor="cat-slug">Slug (auto if blank)</Label>
              <Input
                id="cat-slug"
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
              <Label>Parent Category</Label>
              <Controller
                name="parent_id"
                control={control}
                render={({ field }) => {
                  const currentVal = field.value ? String(field.value) : "none";
                  return (
                    <Select
                      value={currentVal}
                      items={parentOptions}
                      onValueChange={(val) => field.onChange(val ?? "none")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {parentOptions[currentVal] ?? "None (Top-Level Category)"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(parentOptions).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              {errors.parent_id && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.parent_id.message}
                </p>
              )}
            </div>

            {/* Category Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="cat-image" className="inline-flex items-center gap-1.5">
                <Upload className="h-4 w-4" /> Category Image (Homepage &amp; Banner)
              </Label>

              {displayedPreview ? (
                <div className="relative flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-3">
                  <img
                    src={displayedPreview}
                    alt="Category preview"
                    className="h-20 w-28 rounded-lg object-cover border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-medium">
                      {imageFile ? imageFile.name : "Current category image"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Displayed in Homepage Browse by Dress Style cards.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove category image"
                    onClick={() => {
                      clearImageSelection();
                      setRemoveExistingImage(true);
                    }}
                  >
                    <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                  <ImageIcon className="h-4 w-4 shrink-0" />
                  <span>No category image selected (JPG, PNG, or WebP up to 4MB).</span>
                </div>
              )}

              <Input
                id="cat-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />
              {imageError && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {imageError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                aria-invalid={Boolean(errors.description)}
                {...register("description")}
              />
              {errors.description && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 items-start">
              <div className="space-y-1.5">
                <Label htmlFor="cat-sort">Sort Order</Label>
                <Input
                  id="cat-sort"
                  type="number"
                  min="0"
                  aria-invalid={Boolean(errors.sort_order)}
                  {...register("sort_order")}
                />
                {errors.sort_order && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.sort_order.message}
                  </p>
                )}
              </div>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm pt-7 cursor-pointer">
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                    Active
                  </label>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Category?"
        description={`Delete "${deleteTarget?.name}"? Categories with products or child categories cannot be deleted.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
