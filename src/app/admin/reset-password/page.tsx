"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { resetPasswordSchema } from "@/schemas";
import { adminAuthApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
import type { z } from "zod";

type ResetValues = z.infer<typeof resetPasswordSchema>;

function AdminResetInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: searchParams.get("token") || "",
      email: searchParams.get("email") || "",
    },
  });

  const onSubmit = async (values: ResetValues) => {
    try {
      await adminAuthApi.resetPassword(values);
      toast.success("Staff password updated. Please sign in.");
      router.push("/admin/login");
    } catch (err) {
      applyApiErrorsToForm(err, setError, [
        "email",
        "token",
        "password",
        "password_confirmation",
      ]);
      toast.error(getApiErrorMessage(err, "Reset failed."));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader>
          <CardTitle>Set New Staff Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("token")} />
            {errors.token && (
              <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                {errors.token.message}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
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
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password_confirmation">Confirm Password</Label>
              <Input
                id="password_confirmation"
                type="password"
                aria-invalid={Boolean(errors.password_confirmation)}
                {...register("password_confirmation")}
              />
              {errors.password_confirmation && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.password_confirmation.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full rounded-full">
              {isSubmitting ? "Resetting..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}
    >
      <AdminResetInner />
    </Suspense>
  );
}
