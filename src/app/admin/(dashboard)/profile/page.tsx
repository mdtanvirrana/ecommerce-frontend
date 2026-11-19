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
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
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
      applyApiErrorsToForm(err, profileForm.setError, ["name", "email", "phone"]);
      toast.error(getApiErrorMessage(err, "Failed to update profile."));
    }
  };

  const onUpdatePassword = async (values: PasswordValues) => {
    try {
      await adminAuthApi.updatePassword(values);
      passwordForm.reset();
      toast.success("Password changed successfully.");
    } catch (err) {
      applyApiErrorsToForm(err, passwordForm.setError, [
        "current_password",
        "password",
        "password_confirmation",
      ]);
      toast.error(getApiErrorMessage(err, "Failed to update password."));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Staff Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your staff details and manage your password securely.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Name, email, and contact number</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={profileForm.handleSubmit(onUpdateProfile)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="staff-name">Full Name</Label>
                <Input
                  id="staff-name"
                  aria-invalid={Boolean(profileForm.formState.errors.name)}
                  {...profileForm.register("name")}
                />
                {profileForm.formState.errors.name && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-email">Email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  aria-invalid={Boolean(profileForm.formState.errors.email)}
                  {...profileForm.register("email")}
                />
                {profileForm.formState.errors.email && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                aria-invalid={Boolean(profileForm.formState.errors.phone)}
                {...profileForm.register("phone")}
              />
              {profileForm.formState.errors.phone && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {profileForm.formState.errors.phone.message}
                </p>
              )}
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
          <form
            noValidate
            onSubmit={passwordForm.handleSubmit(onUpdatePassword)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                aria-invalid={Boolean(passwordForm.formState.errors.current_password)}
                {...passwordForm.register("current_password")}
              />
              {passwordForm.formState.errors.current_password && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {passwordForm.formState.errors.current_password.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  aria-invalid={Boolean(passwordForm.formState.errors.password)}
                  {...passwordForm.register("password")}
                />
                {passwordForm.formState.errors.password && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  aria-invalid={Boolean(passwordForm.formState.errors.password_confirmation)}
                  {...passwordForm.register("password_confirmation")}
                />
                {passwordForm.formState.errors.password_confirmation && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
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
