"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { loginSchema } from "@/schemas";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/apiClient";
import type { z } from "zod";

type LoginValues = z.infer<typeof loginSchema>;

function AdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";
  const { login } = useAdminAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      toast.success("Signed in to Admin Panel.");
      router.push(redirect);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid staff credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle className="font-display text-2xl">SHOP.CO ADMIN</CardTitle>
          <CardDescription>Sign in with your staff account (dedicated admin guard)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Staff Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="superadmin@shopco.local"
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-[#FF3333]">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/admin/forgot-password"
                  className="text-xs text-black/60 underline hover:text-black"
                >
                  Forgot password?
                </Link>
              </div>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-xs text-[#FF3333]">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-11 rounded-full">
              {submitting ? "Signing in..." : "Sign In to Admin"}
            </Button>
          </form>

          <div className="mt-6 border-t border-black/10 pt-4 text-center text-xs text-black/55">
            <Link href="/" className="underline hover:text-black">
              ← Return to Customer Storefront
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <AdminLoginInner />
    </Suspense>
  );
}
