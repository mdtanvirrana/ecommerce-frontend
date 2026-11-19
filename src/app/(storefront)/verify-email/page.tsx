"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { customerAuthApi } from "@/services/api";
import { useCustomerAuth } from "@/providers/CustomerAuthProvider";
import { getApiErrorMessage } from "@/lib/formErrors";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const { refreshCustomer } = useCustomerAuth();

  const id = searchParams.get("id") ?? "";
  const hash = searchParams.get("hash") ?? "";
  const expires = searchParams.get("expires") ?? "";
  const signature = searchParams.get("signature") ?? "";

  const hasValidParams = Boolean(id && hash && expires && signature);
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    hasValidParams ? "verifying" : "error",
  );
  const [message, setMessage] = useState<string>(
    hasValidParams
      ? "Verifying your email address..."
      : "Invalid or incomplete email verification link.",
  );

  useEffect(() => {
    if (!hasValidParams) return;

    let active = true;
    customerAuthApi
      .verifyEmail({ id, hash, expires, signature })
      .then(async (res) => {
        if (!active) return;
        setStatus("success");
        setMessage(res.message || "Your email address has been verified.");
        await refreshCustomer();
      })
      .catch((err) => {
        if (!active) return;
        setStatus("error");
        setMessage(getApiErrorMessage(err, "This verification link is invalid or has expired."));
      });

    return () => {
      active = false;
    };
  }, [hasValidParams, id, hash, expires, signature, refreshCustomer]);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-[20px] border border-black/10 bg-white p-8 text-center">
        {status === "verifying" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-black" />
            <h1 className="mt-4 font-display text-2xl text-black">VERIFYING EMAIL</h1>
            <p className="mt-2 text-sm text-black/60">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#01AB31]" />
            <h1 className="mt-4 font-display text-2xl text-black">EMAIL VERIFIED</h1>
            <p className="mt-2 text-sm text-black/65">{message}</p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link
                href="/account"
                className="inline-flex h-11 items-center justify-center rounded-full bg-black px-7 text-sm font-medium text-white hover:bg-black/85"
              >
                Go to My Account
              </Link>
              <Link
                href="/shop"
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/15 px-7 text-sm font-medium text-black hover:bg-[#F0F0F0]"
              >
                Continue Shopping
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-[#FF3333]" />
            <h1 className="mt-4 font-display text-2xl text-black">VERIFICATION FAILED</h1>
            <p className="mt-2 text-sm text-black/65">{message}</p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link
                href="/account"
                className="inline-flex h-11 items-center justify-center rounded-full bg-black px-7 text-sm font-medium text-white hover:bg-black/85"
              >
                Request New Link
              </Link>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/15 px-7 text-sm font-medium text-black hover:bg-[#F0F0F0]"
              >
                Return Home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-black/60">
          Loading verification...
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
