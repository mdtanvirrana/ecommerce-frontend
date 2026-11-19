"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
import { staffFormSchema } from "@/schemas";
import type { Staff } from "@/types/api";
import type { z } from "zod";

type StaffFormInput = z.input<typeof staffFormSchema>;
type StaffFormValues = z.output<typeof staffFormSchema>;

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const { staff: currentStaff, hasPermission } = useAdminAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);

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

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormInput, unknown, StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      is_active: true,
      role_ids: [],
    },
  });

  const selectedRoleIds = watch("role_ids") ?? [];

  const openCreate = () => {
    setEditing(null);
    const defaultRole = roles.find((r) => !r.is_super_admin);
    reset({
      name: "",
      email: "",
      phone: "",
      password: "",
      is_active: true,
      role_ids: defaultRole ? [defaultRole.id] : [],
    });
    setDialogOpen(true);
  };

  const openEdit = (member: Staff) => {
    setEditing(member);
    reset({
      name: member.name,
      email: member.email,
      phone: member.phone ?? "",
      password: "",
      is_active: member.is_active,
      role_ids: (member.roles ?? []).map((r) => r.id),
    });
    setDialogOpen(true);
  };

  const toggleRole = (roleId: number) => {
    const next = selectedRoleIds.includes(roleId)
      ? selectedRoleIds.filter((id) => id !== roleId)
      : [...selectedRoleIds, roleId];
    setValue("role_ids", next, { shouldValidate: true });
  };

  const onSubmit = async (values: StaffFormValues) => {
    const rawPassword = values.password?.trim() ?? "";
    if (!editing && rawPassword.length < 8) {
      setError("password", {
        type: "manual",
        message: "Password is required and must be at least 8 characters.",
      });
      return;
    }
    if (
      rawPassword &&
      (!/[A-Z]/.test(rawPassword) ||
        !/[a-z]/.test(rawPassword) ||
        !/[0-9]/.test(rawPassword) ||
        !/[^A-Za-z0-9]/.test(rawPassword))
    ) {
      setError("password", {
        type: "manual",
        message: "Password must include uppercase, lowercase, number, and symbol.",
      });
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || null,
        is_active: values.is_active,
        role_ids: values.role_ids,
      };
      if (rawPassword) {
        payload.password = rawPassword;
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
      applyApiErrorsToForm(err, setError, [
        "name",
        "email",
        "phone",
        "password",
        "role_ids",
      ]);
      toast.error(getApiErrorMessage(err, "Failed to save staff member."));
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
      toast.error(getApiErrorMessage(err, "Cannot delete staff member."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-sm text-muted-foreground">
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
                        <div className="text-xs text-muted-foreground">{member.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(member.roles ?? []).map((r) => (
                            <Badge
                              key={r.id}
                              variant={r.is_super_admin ? "default" : "secondary"}
                            >
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {member.permissions.length} permission(s)
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={member.is_active ? "outline" : "secondary"}
                          className={
                            member.is_active
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : ""
                          }
                        >
                          {member.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {hasPermission("staff.edit") && !protectedTarget && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${member.name}`}
                              onClick={() => openEdit(member)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission("staff.delete") && !member.is_super_admin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${member.name}`}
                              onClick={() => setDeleteTarget(member)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
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
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Add Staff Member"}</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="staff-create-name">Full Name *</Label>
                <Input
                  id="staff-create-name"
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
                <Label htmlFor="staff-create-email">Email *</Label>
                <Input
                  id="staff-create-email"
                  type="email"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />
                {errors.email && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-create-phone">Phone</Label>
                <Input
                  id="staff-create-phone"
                  aria-invalid={Boolean(errors.phone)}
                  {...register("phone")}
                />
                {errors.phone && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-create-password">
                  {editing ? "New Password (optional)" : "Password *"}
                </Label>
                <Input
                  id="staff-create-password"
                  type="password"
                  aria-invalid={Boolean(errors.password)}
                  placeholder="Min 8 chars, mixed, number, symbol"
                  {...register("password")}
                />
                {errors.password && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assign Roles (multiple allowed) *</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 rounded-xl border border-border p-3">
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
              {errors.role_ids && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.role_ids.message}
                </p>
              )}
            </div>

            {!editing?.is_super_admin && (
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                    Active account
                  </label>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Staff"}
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
