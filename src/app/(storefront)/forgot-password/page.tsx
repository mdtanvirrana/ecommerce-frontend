"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { forgotPasswordSchema } from "@/schemas";
import { customerAuthApi } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
import type { z } from "zod";

type ForgotValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotValues) => {
    try {
      await customerAuthApi.forgotPassword(values.email);
      setSent(true);
      toast.success("Password reset instructions sent.");
    } catch (err) {
      const mapped = applyApiErrorsToForm(err, setError, ["email"]);
      const message = getApiErrorMessage(err, "Unable to send password reset email.");
      if (!mapped) {
        setError("email", { type: "server", message });
      }
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-[20px] border border-black/10 p-7 sm:p-9">
        <h1 className="font-display text-3xl text-black">RESET PASSWORD</h1>
        {sent ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-black/70">
              If an account exists for that email address, we have sent a password reset link.
            </p>
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-black text-sm font-medium text-white"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Account Email</Label>
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
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-full bg-black text-sm font-medium text-white hover:bg-black/85 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
