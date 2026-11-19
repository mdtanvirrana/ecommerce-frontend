"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { resetPasswordSchema } from "@/schemas";
import { customerAuthApi } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
import type { z } from "zod";

type ResetValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordInner() {
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
      await customerAuthApi.resetPassword(values);
      toast.success("Password updated. Please sign in.");
      router.push("/login");
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
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-[20px] border border-black/10 p-7 sm:p-9">
        <h1 className="font-display text-3xl text-black">NEW PASSWORD</h1>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <input type="hidden" {...register("token")} />
          {errors.token && (
            <p role="alert" className="text-xs font-medium text-[#FF3333]">
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
              <p role="alert" className="text-xs font-medium text-[#FF3333]">
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
            disabled={isSubmitting}
            className="h-12 w-full rounded-full bg-black text-sm font-medium text-white hover:bg-black/85 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Updating..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-14">Loading...</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
