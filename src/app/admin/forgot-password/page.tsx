"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { forgotPasswordSchema } from "@/schemas";
import { adminAuthApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
import type { z } from "zod";

type ForgotValues = z.infer<typeof forgotPasswordSchema>;

export default function AdminForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotValues) => {
    try {
      await adminAuthApi.forgotPassword(values.email);
      setSent(true);
      toast.success("Reset link sent if account exists.");
    } catch (err) {
      const mapped = applyApiErrorsToForm(err, setError, ["email"]);
      const message = getApiErrorMessage(err, "Failed to request password reset.");
      if (!mapped) {
        setError("email", { type: "server", message });
      }
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader>
          <CardTitle>Staff Password Reset</CardTitle>
          <CardDescription>Enter your staff email to receive a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If a staff account matches that email, a password reset link has been dispatched.
              </p>
              <Button
                className="w-full rounded-full"
                render={<Link href="/admin/login" />}
                nativeButton={false}
              >
                Back to Staff Login
              </Button>
            </div>
          ) : (
            <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Staff Email</Label>
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
              <Button type="submit" disabled={isSubmitting} className="w-full rounded-full">
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
