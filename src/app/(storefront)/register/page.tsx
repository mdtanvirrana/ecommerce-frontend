"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerSchema } from "@/schemas";
import { useCustomerAuth } from "@/providers/CustomerAuthProvider";
import { useCart } from "@/providers/CartProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
import type { z } from "zod";

type RegisterValues = z.infer<typeof registerSchema>;

function CustomerRegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/account";
  const { register: registerCustomer } = useCustomerAuth();
  const { refreshCart } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterValues) => {
    setSubmitting(true);
    try {
      await registerCustomer(values);
      await refreshCart();
      toast.success("Account created! Welcome to SHOP.CO.");
      router.replace(redirect);
      router.refresh();
    } catch (err) {
      applyApiErrorsToForm(err, setError, [
        "name",
        "email",
        "phone",
        "password",
        "password_confirmation",
      ]);
      toast.error(getApiErrorMessage(err, "Registration failed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-[20px] border border-black/10 p-7 sm:p-9">
        <h1 className="font-display text-3xl text-black">CREATE ACCOUNT</h1>
        <p className="mt-2 text-sm text-black/60">
          Join SHOP.CO and use code <span className="font-semibold text-black">WELCOME20</span> for
          20% off your first order.
        </p>

        <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name && (
              <p role="alert" className="text-xs font-medium text-[#FF3333]">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            {errors.email && (
              <p role="alert" className="text-xs font-medium text-[#FF3333]">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input id="phone" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
            {errors.phone && (
              <p role="alert" className="text-xs font-medium text-[#FF3333]">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
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

          <div className="space-y-1.5">
            <Label htmlFor="password_confirmation">Confirm Password</Label>
            <Input
              id="password_confirmation"
              type="password"
              aria-invalid={Boolean(errors.password_confirmation)}
              {...register("password_confirmation")}
            />
            {errors.password_confirmation && (
              <p role="alert" className="text-xs font-medium text-[#FF3333]">
                {errors.password_confirmation.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-full bg-black text-sm font-medium text-white hover:bg-black/85 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-black/60">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-black underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function CustomerRegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-14">Loading...</div>}>
      <CustomerRegisterInner />
    </Suspense>
  );
}
