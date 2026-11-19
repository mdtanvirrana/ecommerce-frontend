"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/services/api";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiError } from "@/lib/apiClient";
import type { Permission, Role } from "@/types/api";

export default function AdminRolesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAdminAuth();

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [draftPermIds, setDraftPermIds] = useState<number[] | null>(null);
  const [savingPerms, setSavingPerms] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: rolesRes, isLoading: loadingRoles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => adminApi.getRoles(),
  });
  const { data: permsRes, isLoading: loadingPerms } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () => adminApi.getPermissions(),
  });

  const roles = rolesRes?.data ?? [];
  const permissions = permsRes?.data ?? [];

  const activeRole =
    roles.find((r) => r.id === selectedRoleId) ?? roles[0] ?? null;

  const activePermissionIds = useMemo(() => {
    if (draftPermIds !== null) return draftPermIds;
    if (!activeRole) return [];
    if (activeRole.is_super_admin) return permissions.map((p) => p.id);
    return (activeRole.permissions ?? []).map((p) => p.id);
  }, [activeRole, draftPermIds, permissions]);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const p of permissions) {
      if (!groups[p.group]) groups[p.group] = [];
      groups[p.group].push(p);
    }
    return groups;
  }, [permissions]);

  const selectRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setDraftPermIds(null);
  };

  const togglePermission = (permId: number) => {
    if (!activeRole || activeRole.is_super_admin || !hasPermission("permissions.assign")) return;
    const base = draftPermIds ?? (activeRole.permissions ?? []).map((p) => p.id);
    setDraftPermIds(
      base.includes(permId) ? base.filter((id) => id !== permId) : [...base, permId],
    );
  };

  const handleSavePermissions = async () => {
    if (!activeRole || activeRole.is_super_admin || draftPermIds === null) return;
    setSavingPerms(true);
    try {
      await adminApi.syncRolePermissions(activeRole.id, draftPermIds);
      toast.success(`Permissions saved for ${activeRole.name}.`);
      setDraftPermIds(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save permissions.");
    } finally {
      setSavingPerms(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await adminApi.createRole({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        permission_ids: [],
      });
      toast.success(`Role "${res.data.name}" created.`);
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      await queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setSelectedRoleId(res.data.id);
      setDraftPermIds([]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create role.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteRole(deleteTarget.id);
      toast.success("Custom role deleted.");
      setDeleteTarget(null);
      setSelectedRoleId(null);
      setDraftPermIds(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cannot delete role.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Roles &amp; Permissions Matrix</h1>
          <p className="text-sm text-black/60 dark:text-zinc-400">
            Database-driven RBAC. Changes immediately control backend API middleware and frontend
            visibility.
          </p>
        </div>
        {hasPermission("roles.create") && (
          <Button onClick={() => setCreateOpen(true)} className="rounded-full">
            <Plus className="h-4 w-4" /> Create Custom Role
          </Button>
        )}
      </div>

      {loadingRoles || loadingPerms ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Role Selector */}
          <div className="space-y-2 lg:col-span-4">
            {roles.map((role) => {
              const selected = activeRole?.id === role.id;
              return (
                <div
                  key={role.id}
                  onClick={() => selectRole(role)}
                  className={`flex items-start justify-between rounded-xl border p-4 transition-colors cursor-pointer ${
                    selected
                      ? "border-black bg-black/5 dark:border-white dark:bg-zinc-800"
                      : "border-black/10 bg-white hover:bg-black/[0.02] dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{role.name}</span>
                      {role.is_super_admin && (
                        <Badge variant="default" className="text-[10px]">
                          All Access
                        </Badge>
                      )}
                      {role.is_system && !role.is_super_admin && (
                        <Badge variant="secondary" className="text-[10px]">
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-black/55 dark:text-zinc-400">
                      {role.description || "Custom role"}
                    </p>
                    <p className="mt-1 text-[11px] text-black/45 dark:text-zinc-500">
                      {role.staff_count ?? 0} staff member(s)
                    </p>
                  </div>

                  {!role.is_system && hasPermission("roles.delete") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(role);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-[#FF3333]" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Grouped Permission Matrix */}
          <Card className="lg:col-span-8">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{activeRole?.name ?? "Select a role"}</CardTitle>
                <CardDescription>
                  {activeRole?.is_super_admin
                    ? "Super Admin automatically holds all permissions and cannot be restricted."
                    : "Toggle granular permissions below and click Save Permissions."}
                </CardDescription>
              </div>
              {activeRole &&
                !activeRole.is_super_admin &&
                hasPermission("permissions.assign") && (
                  <Button
                    disabled={draftPermIds === null || savingPerms}
                    onClick={handleSavePermissions}
                  >
                    <Save className="h-4 w-4" />
                    {savingPerms ? "Saving..." : "Save Permissions"}
                  </Button>
                )}
              {activeRole?.is_super_admin && (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" /> Protected
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              {Object.entries(groupedPermissions).map(([group, perms]) => (
                <div
                  key={group}
                  className="rounded-xl border border-black/10 dark:border-zinc-800 p-4"
                >
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-black/60 dark:text-zinc-400">
                    {group}
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {perms.map((perm) => {
                      const checked = activePermissionIds.includes(perm.id);
                      const disabled =
                        !activeRole ||
                        activeRole.is_super_admin ||
                        !hasPermission("permissions.assign");
                      return (
                        <label
                          key={perm.id}
                          className="flex items-start gap-2.5 text-sm cursor-pointer"
                        >
                          <Checkbox
                            className="mt-0.5"
                            disabled={disabled}
                            checked={checked}
                            onCheckedChange={() => togglePermission(perm.id)}
                          />
                          <div>
                            <p className="font-mono text-xs font-semibold">{perm.name}</p>
                            {perm.description && (
                              <p className="text-[11px] text-black/55 dark:text-zinc-400">
                                {perm.description}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRole} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Role Name *</Label>
              <Input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Inventory Auditor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Reviews stock levels and adjusts inventory"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Role"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Custom Role?"
        description={`Delete custom role "${deleteTarget?.name}"? Roles assigned to staff cannot be deleted.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDeleteRole}
      />
    </div>
  );
}
