"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { changePasswordSchema, profileSchema } from "@/schemas";
import { adminAuthApi } from "@/services/api";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/apiClient";
import type { z } from "zod";

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof changePasswordSchema>;

export default function AdminProfilePage() {
  const { staff, refreshStaff } = useAdminAuth();

  const profileForm = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  useEffect(() => {
    if (staff) {
      profileForm.reset({
        name: staff.name,
        email: staff.email,
        phone: staff.phone ?? "",
      });
    }
  }, [staff, profileForm]);

  const onUpdateProfile = async (values: ProfileValues) => {
    try {
      await adminAuthApi.updateProfile(values);
      await refreshStaff();
      toast.success("Staff profile updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile.");
    }
  };

  const onUpdatePassword = async (values: PasswordValues) => {
    try {
      await adminAuthApi.updatePassword(values);
      passwordForm.reset();
      toast.success("Password changed successfully.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update password.");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Staff Profile</h1>
        <p className="text-sm text-black/60 dark:text-zinc-400">
          Update your staff details and manage your password securely.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Name, email, and contact number</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input {...profileForm.register("name")} />
                {profileForm.formState.errors.name && (
                  <p className="text-xs text-[#FF3333]">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" {...profileForm.register("email")} />
                {profileForm.formState.errors.email && (
                  <p className="text-xs text-[#FF3333]">
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input {...profileForm.register("phone")} />
            </div>
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Requires a strong password (min 8 chars, upper, lower, number, symbol).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onUpdatePassword)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input type="password" {...passwordForm.register("current_password")} />
              {passwordForm.formState.errors.current_password && (
                <p className="text-xs text-[#FF3333]">
                  {passwordForm.formState.errors.current_password.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input type="password" {...passwordForm.register("password")} />
                {passwordForm.formState.errors.password && (
                  <p className="text-xs text-[#FF3333]">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input type="password" {...passwordForm.register("password_confirmation")} />
                {passwordForm.formState.errors.password_confirmation && (
                  <p className="text-xs text-[#FF3333]">
                    {passwordForm.formState.errors.password_confirmation.message}
                  </p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
              {passwordForm.formState.isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
