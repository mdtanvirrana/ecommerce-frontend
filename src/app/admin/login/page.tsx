"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Shield } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, twoFactorCodeSchema } from "@/schemas";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
import type { z } from "zod";

type LoginValues = z.infer<typeof loginSchema>;
type TwoFactorValues = z.infer<typeof twoFactorCodeSchema>;

function AdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";
  const { login, completeTwoFactor } = useAdminAuth();
  const [submitting, setSubmitting] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const twoFactorForm = useForm<TwoFactorValues>({
    resolver: zodResolver(twoFactorCodeSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    try {
      const result = await login(values.email, values.password);
      if (result.requiresTwoFactor) {
        setTwoFactorToken(result.twoFactorToken);
        twoFactorForm.reset({ code: "" });
        toast.info("Enter your 6-digit authenticator code to complete sign-in.");
        return;
      }
      toast.success("Signed in to Admin Panel.");
      router.push(redirect);
    } catch (err) {
      const mapped = applyApiErrorsToForm(err, setError, ["email", "password"]);
      const message = getApiErrorMessage(err, "Invalid staff credentials.");
      if (!mapped) {
        setError("password", { type: "server", message });
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onVerifyTwoFactor = async (values: TwoFactorValues) => {
    if (!twoFactorToken) return;
    setSubmitting(true);
    try {
      const { usedRecoveryCode } = await completeTwoFactor(twoFactorToken, values.code);
      toast.success(
        usedRecoveryCode
          ? "Signed in with a recovery code. Consider regenerating your recovery codes."
          : "Two-factor verification successful.",
      );
      router.push(redirect);
    } catch (err) {
      const mapped = applyApiErrorsToForm(err, twoFactorForm.setError, ["code"]);
      const message = getApiErrorMessage(err, "Invalid authentication code.");
      if (!mapped) {
        twoFactorForm.setError("code", { type: "server", message });
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {twoFactorToken ? <KeyRound className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
          </div>
          <CardTitle className="font-display text-2xl">
            {twoFactorToken ? "TWO-FACTOR CHECK" : "SHOP.CO ADMIN"}
          </CardTitle>
          <CardDescription>
            {twoFactorToken
              ? "Enter the 6-digit code from your authenticator app or an 8-character recovery code."
              : "Sign in with your staff account (dedicated admin guard)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {twoFactorToken ? (
            <form
              noValidate
              onSubmit={twoFactorForm.handleSubmit(onVerifyTwoFactor)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="totp-code">Authenticator or Recovery Code</Label>
                <Input
                  id="totp-code"
                  autoFocus
                  autoComplete="one-time-code"
                  placeholder="123456 or XXXX-XXXX"
                  className="text-center font-mono text-base tracking-widest"
                  aria-invalid={Boolean(twoFactorForm.formState.errors.code)}
                  {...twoFactorForm.register("code")}
                />
                {twoFactorForm.formState.errors.code && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {twoFactorForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={submitting} className="w-full h-11 rounded-full">
                {submitting ? "Verifying..." : "Verify & Sign In"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setTwoFactorToken(null);
                  twoFactorForm.reset({ code: "" });
                }}
              >
                ← Back to Staff Login
              </Button>
            </form>
          ) : (
            <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Staff Email</Label>
                <Input
                  id="email"
                  type="email"
                  aria-invalid={Boolean(errors.email)}
                  placeholder="superadmin@shopco.local"
                  {...register("email")}
                />
                {errors.email && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/admin/forgot-password"
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Forgot password?
                  </Link>
                </div>
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

              <Button type="submit" disabled={submitting} className="w-full h-11 rounded-full">
                {submitting ? "Signing in..." : "Sign In to Admin"}
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
            <Link href="/" className="underline hover:text-foreground">
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
    <Suspense
      fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}
    >
      <AdminLoginInner />
    </Suspense>
  );
}
