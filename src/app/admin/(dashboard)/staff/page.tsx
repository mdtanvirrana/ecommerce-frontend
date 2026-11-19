"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/services/api";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/apiClient";
import type { Staff } from "@/types/api";

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const { staff: currentStaff, hasPermission } = useAdminAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: staffRes, isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => adminApi.getStaff({ per_page: 50 }),
  });

  const { data: rolesRes } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => adminApi.getRoles(),
  });

  const staffList = staffRes?.data ?? [];
  const roles = rolesRes?.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setIsActive(true);
    const defaultRole = roles.find((r) => !r.is_super_admin);
    setSelectedRoleIds(defaultRole ? [defaultRole.id] : []);
    setDialogOpen(true);
  };

  const openEdit = (member: Staff) => {
    setEditing(member);
    setName(member.name);
    setEmail(member.email);
    setPhone(member.phone ?? "");
    setPassword("");
    setIsActive(member.is_active);
    setSelectedRoleIds((member.roles ?? []).map((r) => r.id));
    setDialogOpen(true);
  };

  const toggleRole = (roleId: number) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoleIds.length === 0) {
      toast.error("Assign at least one role.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        is_active: isActive,
        role_ids: selectedRoleIds,
      };
      if (password.trim()) {
        payload.password = password;
      }

      if (editing) {
        await adminApi.updateStaff(editing.id, payload);
        toast.success("Staff member updated.");
      } else {
        await adminApi.createStaff(payload);
        toast.success("Staff member created.");
      }
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save staff member.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteStaff(deleteTarget.id);
      toast.success("Staff member deleted.");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cannot delete staff member.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-sm text-black/60 dark:text-zinc-400">
            Assign one or multiple database roles to staff accounts. Super Admin accounts are
            protected.
          </p>
        </div>
        {hasPermission("staff.create") && (
          <Button onClick={openCreate} className="rounded-full">
            <Plus className="h-4 w-4" /> Add Staff Member
          </Button>
        )}
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
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Assigned Roles</TableHead>
                  <TableHead>Effective Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((member) => {
                  const protectedTarget = member.is_super_admin && !currentStaff?.is_super_admin;
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{member.name}</span>
                          {member.is_super_admin && (
                            <Badge variant="default" className="gap-1 text-[10px]">
                              <ShieldAlert className="h-3 w-3" /> Protected
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-black/55 dark:text-zinc-400">{member.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(member.roles ?? []).map((r) => (
                            <Badge key={r.id} variant={r.is_super_admin ? "default" : "secondary"}>
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-black/60 dark:text-zinc-400">
                        {member.permissions.length} permission(s)
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? "success" : "secondary"}>
                          {member.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {hasPermission("staff.edit") && !protectedTarget && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(member)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission("staff.delete") && !member.is_super_admin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(member)}
                            >
                              <Trash2 className="h-4 w-4 text-[#FF3333]" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Add Staff Member"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{editing ? "New Password (optional)" : "Password *"}</Label>
                <Input
                  required={!editing}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, mixed, number, symbol"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assign Roles (multiple allowed) *</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 rounded-xl border border-black/10 dark:border-zinc-800 p-3">
                {roles.map((r) => {
                  const disabled = r.is_super_admin && !currentStaff?.is_super_admin;
                  return (
                    <label
                      key={r.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        disabled={disabled}
                        checked={selectedRoleIds.includes(r.id)}
                        onCheckedChange={() => toggleRole(r.id)}
                      />
                      <span>{r.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {!editing?.is_super_admin && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={isActive} onCheckedChange={setIsActive} /> Active account
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Staff"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Staff Account?"
        description={`Delete staff account "${deleteTarget?.name}" (${deleteTarget?.email})?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
