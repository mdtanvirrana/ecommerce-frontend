"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, FolderTree, Plus, Trash2 } from "lucide-react";
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
import { ApiError } from "@/lib/apiClient";
import type { Category } from "@/types/api";

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAdminAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: treeRes, isLoading } = useQuery({
    queryKey: ["admin-categories-tree"],
    queryFn: () => adminApi.getCategories(false),
  });
  const tree = treeRes?.data ?? [];

  const openCreate = (defaultParentId?: number) => {
    setEditing(null);
    setName("");
    setSlug("");
    setParentId(defaultParentId ? String(defaultParentId) : "");
    setDescription("");
    setSortOrder("0");
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setParentId(cat.parent_id ? String(cat.parent_id) : "");
    setDescription(cat.description ?? "");
    setSortOrder(String(cat.sort_order));
    setIsActive(cat.is_active);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        parent_id: parentId ? Number(parentId) : null,
        description: description || null,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      };
      if (editing) {
        await adminApi.updateCategory(editing.id, payload);
        toast.success("Category updated.");
      } else {
        await adminApi.createCategory(payload);
        toast.success("Category created.");
      }
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-categories-tree"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-categories-flat"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save category.");
    } finally {
      setSaving(false);
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
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cannot delete category.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-black/60 dark:text-zinc-400">
            Two-level parent/child category hierarchy with circular relationship protection.
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
                  <div className="flex items-center gap-3">
                    <FolderTree className="h-5 w-5 text-black/60 dark:text-zinc-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold">{parent.name}</h2>
                        <Badge variant={parent.is_active ? "default" : "secondary"}>
                          {parent.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-xs text-black/50 dark:text-zinc-400">
                          /{parent.slug}
                        </span>
                      </div>
                      {parent.description && (
                        <p className="mt-0.5 text-xs text-black/60 dark:text-zinc-400">
                          {parent.description}
                        </p>
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
                      <Button variant="ghost" size="icon" onClick={() => openEdit(parent)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission("categories.delete") && (
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(parent)}>
                        <Trash2 className="h-4 w-4 text-[#FF3333]" />
                      </Button>
                    )}
                  </div>
                </div>

                {parent.children && parent.children.length > 0 && (
                  <div className="mt-4 ml-4 border-l-2 border-black/10 dark:border-zinc-800 pl-4 space-y-2">
                    {parent.children.map((child) => (
                      <div
                        key={child.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5 text-sm">
                          <span className="font-medium">{child.name}</span>
                          <span className="text-xs text-black/50 dark:text-zinc-400">
                            /{child.slug}
                          </span>
                          <Badge variant="outline" className="text-[11px]">
                            {child.products_count ?? 0} products
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {hasPermission("categories.edit") && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(child)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {hasPermission("categories.delete") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(child)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-[#FF3333]" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Create Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (auto if blank)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Parent Category</Label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">None (Top-Level Category)</option>
                {tree
                  .filter((p) => !editing || p.id !== editing.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm pt-5 cursor-pointer">
                <Switch checked={isActive} onCheckedChange={setIsActive} /> Active
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Category"}
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
