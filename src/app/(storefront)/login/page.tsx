"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginSchema } from "@/schemas";
import { useCustomerAuth } from "@/providers/CustomerAuthProvider";
import { useCart } from "@/providers/CartProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
import type { z } from "zod";

type LoginValues = z.infer<typeof loginSchema>;

function CustomerLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { login } = useCustomerAuth();
  const { refreshCart } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      await refreshCart();
      toast.success("Welcome back!");
      router.push(redirect);
    } catch (err) {
      const mapped = applyApiErrorsToForm(err, setError, ["email", "password"]);
      const message = getApiErrorMessage(err, "Invalid email or password.");
      if (!mapped) {
        setError("password", { type: "server", message });
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-[20px] border border-black/10 p-7 sm:p-9">
        <h1 className="font-display text-3xl text-black">SIGN IN</h1>
        <p className="mt-2 text-sm text-black/60">
          Access your persistent cart, saved orders, and faster checkout.
        </p>

        <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              aria-invalid={Boolean(errors.email)}
              placeholder="customer@shopco.local"
              {...register("email")}
            />
            {errors.email && (
              <p role="alert" className="text-xs font-medium text-[#FF3333]">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-black/60 underline hover:text-black"
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
              <p role="alert" className="text-xs font-medium text-[#FF3333]">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-full bg-black text-sm font-medium text-white hover:bg-black/85 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-black/60">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-black underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-14">Loading...</div>}>
      <CustomerLoginInner />
    </Suspense>
  );
}
