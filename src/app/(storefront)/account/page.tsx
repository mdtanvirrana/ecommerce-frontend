"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { profileSchema } from "@/schemas";
import { customerAuthApi } from "@/services/api";
import { useCustomerAuth } from "@/providers/CustomerAuthProvider";
import { Breadcrumb } from "@/components/storefront/Breadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
import type { z } from "zod";

type ProfileValues = z.infer<typeof profileSchema>;

export default function CustomerAccountPage() {
  const { customer, refreshCustomer } = useCustomerAuth();
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? "",
      });
    }
  }, [customer, reset]);

  const onSubmit = async (values: ProfileValues) => {
    try {
      await customerAuthApi.updateProfile(values);
      await refreshCustomer();
      toast.success("Profile updated successfully.");
    } catch (err) {
      applyApiErrorsToForm(err, setError, ["name", "email", "phone"]);
      toast.error(getApiErrorMessage(err, "Failed to update profile."));
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const res = await customerAuthApi.resendVerificationEmail();
      toast.success(res.message || "Verification email sent.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not resend verification email."));
    } finally {
      setResending(false);
    }
  };

  const isVerified = Boolean(customer?.email_verified_at || customer?.is_email_verified);

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-8 xl:px-0">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "My Profile" }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[32px] sm:text-[40px] text-black">MY ACCOUNT</h1>
        {customer && isVerified && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Email Verified
          </span>
        )}
      </div>

      {customer && !isVerified && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-amber-300 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Please verify your email address
              </p>
              <p className="text-xs text-amber-800">
                We sent a verification link to <strong>{customer.email}</strong>. Check your inbox
                (or Mailpit) to confirm your account.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={resending}
            onClick={handleResendVerification}
            className="h-9 rounded-full bg-amber-900 px-5 text-xs font-medium text-white hover:bg-amber-950 disabled:opacity-50 cursor-pointer"
          >
            {resending ? "Sending..." : "Resend Verification Email"}
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-[20px] border border-black/10 p-6 sm:p-8 lg:col-span-7">
          <h2 className="text-xl font-bold text-black">Profile Information</h2>
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
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
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
              {errors.phone && (
                <p role="alert" className="text-xs font-medium text-[#FF3333]">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 rounded-full bg-black px-8 text-sm font-medium text-white hover:bg-black/85 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        <div className="rounded-[20px] border border-black/10 p-6 lg:col-span-5 space-y-3">
          <h2 className="text-xl font-bold text-black">Quick Links</h2>
          <Link
            href="/orders"
            className="block rounded-xl bg-[#F0F0F0] px-4 py-3 text-sm font-medium text-black hover:bg-black/10"
          >
            View Order History &amp; Tracking
          </Link>
          <Link
            href="/cart"
            className="block rounded-xl bg-[#F0F0F0] px-4 py-3 text-sm font-medium text-black hover:bg-black/10"
          >
            View Shopping Cart
          </Link>
        </div>
      </div>
    </div>
  );
}
