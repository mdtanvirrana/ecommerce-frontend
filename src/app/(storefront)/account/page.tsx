"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { profileSchema } from "@/schemas";
import { customerAuthApi } from "@/services/api";
import { useCustomerAuth } from "@/providers/CustomerAuthProvider";
import { Breadcrumb } from "@/components/storefront/Breadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/apiClient";
import type { z } from "zod";

type ProfileValues = z.infer<typeof profileSchema>;

export default function CustomerAccountPage() {
  const { customer, refreshCustomer } = useCustomerAuth();
  const {
    register,
    handleSubmit,
    reset,
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
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile.");
    }
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-8 xl:px-0">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "My Profile" }]} />
      <h1 className="font-display text-[32px] sm:text-[40px] text-black">MY ACCOUNT</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-[20px] border border-black/10 p-6 sm:p-8 lg:col-span-7">
          <h2 className="text-xl font-bold text-black">Profile Information</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-[#FF3333]">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-[#FF3333]">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
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
