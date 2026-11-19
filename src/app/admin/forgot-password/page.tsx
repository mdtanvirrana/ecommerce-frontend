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
import type { z } from "zod";

type ForgotValues = z.infer<typeof forgotPasswordSchema>;

export default function AdminForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotValues) => {
    try {
      await adminAuthApi.forgotPassword(values.email);
      setSent(true);
      toast.success("Reset link sent if account exists.");
    } catch {
      toast.error("Failed to request password reset.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader>
          <CardTitle>Staff Password Reset</CardTitle>
          <CardDescription>Enter your staff email to receive a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-black/70">
                If a staff account matches that email, a password reset link has been dispatched.
              </p>
              <Button asChild className="w-full rounded-full">
                <Link href="/admin/login">Back to Staff Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Staff Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-[#FF3333]">{errors.email.message}</p>}
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
