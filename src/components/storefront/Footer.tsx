"use client";

import React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { newsletterSchema } from "@/schemas";
import type { z } from "zod";

type NewsletterValues = z.infer<typeof newsletterSchema>;

function VisaLogo() {
  return (
    <svg viewBox="0 0 48 16" className="h-3.5 w-auto" aria-label="Visa" role="img">
      <text
        x="24"
        y="13"
        textAnchor="middle"
        fill="#1434CB"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="14.5"
        letterSpacing="-0.5"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardLogo() {
  return (
    <svg viewBox="0 0 36 22" className="h-5 w-auto" aria-label="Mastercard" role="img">
      <circle cx="13" cy="11" r="8.5" fill="#EB001B" />
      <circle cx="23" cy="11" r="8.5" fill="#F79E1B" />
      <path
        d="M18 4.3a8.48 8.48 0 0 0 0 13.4 8.48 8.48 0 0 0 0-13.4Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

function PayPalLogo() {
  return (
    <svg viewBox="0 0 60 18" className="h-3.5 w-auto" aria-label="PayPal" role="img">
      <text
        x="30"
        y="13.5"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontStyle="italic"
        fontSize="13.5"
      >
        <tspan fill="#003087">Pay</tspan>
        <tspan fill="#009CDE">Pal</tspan>
      </text>
    </svg>
  );
}

function ApplePayLogo() {
  return (
    <svg viewBox="0 0 54 20" className="h-4 w-auto" aria-label="Apple Pay" role="img">
      <path
        fill="#000000"
        d="M12.3 5.2c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 2-.5 2.5-1.2Zm.9 1.4c-1.4-.1-2.6.8-3.2.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.7.7 2.8.7 1.2 0 1.9-1 2.6-2.1.8-1.2 1.2-2.4 1.2-2.4 0 0-2.3-.9-2.3-3.5 0-2.2 1.8-3.3 1.9-3.3-1.1-1.5-2.7-1.6-3.3-1.6Z"
        transform="translate(2, 0.5) scale(0.85)"
      />
      <text
        x="21"
        y="14.2"
        fill="#000000"
        fontFamily="-apple-system, BlinkMacSystemFont, Arial, sans-serif"
        fontWeight="600"
        fontSize="12.5"
        letterSpacing="-0.3"
      >
        Pay
      </text>
    </svg>
  );
}

function GooglePayLogo() {
  return (
    <svg viewBox="0 0 54 20" className="h-4 w-auto" aria-label="Google Pay" role="img">
      <g transform="translate(4, 3) scale(0.58)">
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.2 0-5.8-2.1-6.8-5H1.2v3.1C3.2 21.3 7.3 24 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.2 14.3a7.1 7.1 0 0 1 0-4.6V6.6H1.2a12 12 0 0 0 0 10.8l4-3.1Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.7c1.8 0 3.4.6 4.6 1.8l3.5-3.5C18 1.1 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.6l4 3.1c1-2.9 3.6-5 6.8-5Z"
        />
      </g>
      <text
        x="21.5"
        y="14.2"
        fill="#5F6368"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="600"
        fontSize="12"
      >
        Pay
      </text>
    </svg>
  );
}

const PAYMENT_LOGOS = [
  { name: "Visa", Component: VisaLogo },
  { name: "Mastercard", Component: MastercardLogo },
  { name: "PayPal", Component: PayPalLogo },
  { name: "Apple Pay", Component: ApplePayLogo },
  { name: "Google Pay", Component: GooglePayLogo },
];

export function StorefrontFooter() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewsletterValues>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "" },
  });

  const handleSubscribe = (values: NewsletterValues) => {
    toast.success(
      `Subscribed ${values.email}! Use code WELCOME20 for 20% off your first order.`,
    );
    reset();
  };

  return (
    <footer id="footer" className="mt-16 sm:mt-20">
      {/* Overlapping Black Newsletter Banner matching Figma */}
      <div className="relative z-10 mx-auto max-w-[1240px] px-4 xl:px-0">
        <div className="-mb-[145px] sm:-mb-[90px] rounded-[20px] bg-black px-6 py-8 sm:px-16 sm:py-9 text-white">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <h2 className="font-display max-w-[551px] text-[32px] leading-[1.1] sm:text-[40px]">
              STAY UPTO DATE ABOUT OUR LATEST OFFERS
            </h2>
            <form
              noValidate
              onSubmit={handleSubmit(handleSubscribe)}
              className="flex w-full flex-col gap-3 sm:max-w-[349px]"
            >
              <div>
                <div className="relative flex items-center">
                  <Mail className="pointer-events-none absolute left-4 h-5 w-5 text-black/40" />
                  <input
                    type="email"
                    aria-invalid={Boolean(errors.email)}
                    placeholder="Enter your email address"
                    className="h-12 w-full rounded-full bg-white pl-12 pr-4 text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-white/60"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p role="alert" className="mt-1.5 pl-4 text-xs font-medium text-red-400">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="h-12 w-full rounded-full bg-white text-sm font-medium text-black transition-colors hover:bg-white/90 cursor-pointer"
              >
                Subscribe to Newsletter
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Gray Footer Surface */}
      <div className="bg-[#F0F0F0] pt-[180px] sm:pt-[140px] pb-16">
        <div className="mx-auto max-w-[1240px] px-4 xl:px-0">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
            {/* Brand Column */}
            <div className="col-span-2 lg:col-span-4">
              <Link
                href="/"
                className="font-display text-[28px] sm:text-[33px] leading-none text-black"
              >
                SHOP.CO
              </Link>
              <p className="mt-4 max-w-[260px] text-sm leading-relaxed text-black/60">
                We have clothes that suits your style and which you&apos;re proud to wear. From
                women to men.
              </p>
              <div className="mt-6 flex items-center gap-3">
                {[
                  { label: "Twitter", text: "𝕏", active: false },
                  { label: "Facebook", text: "f", active: true },
                  { label: "Instagram", text: "◎", active: false },
                  { label: "GitHub", text: "⌂", active: false },
                ].map((s) => (
                  <a
                    key={s.label}
                    href="#footer"
                    aria-label={s.label}
                    className={
                      s.active
                        ? "flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-bold text-white"
                        : "flex h-7 w-7 items-center justify-center rounded-full border border-black/20 bg-white text-xs font-bold text-black hover:bg-black hover:text-white transition-colors"
                    }
                  >
                    {s.text}
                  </a>
                ))}
              </div>
            </div>

            {/* Link Columns matching Figma */}
            <div className="col-span-1 lg:col-span-2">
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-black">
                COMPANY
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-black/60">
                <li><Link href="/shop" className="hover:text-black">About</Link></li>
                <li><Link href="/shop?featured=1" className="hover:text-black">Features</Link></li>
                <li><Link href="/shop?new_arrivals=1" className="hover:text-black">Works</Link></li>
                <li><Link href="/shop" className="hover:text-black">Career</Link></li>
              </ul>
            </div>

            <div className="col-span-1 lg:col-span-2">
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-black">
                HELP
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-black/60">
                <li><Link href="/orders" className="hover:text-black">Customer Support</Link></li>
                <li><Link href="/orders" className="hover:text-black">Delivery Details</Link></li>
                <li><Link href="/shop" className="hover:text-black">Terms &amp; Conditions</Link></li>
                <li><Link href="/shop" className="hover:text-black">Privacy Policy</Link></li>
              </ul>
            </div>

            <div className="col-span-1 lg:col-span-2">
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-black">
                FAQ
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-black/60">
                <li><Link href="/account" className="hover:text-black">Account</Link></li>
                <li><Link href="/orders" className="hover:text-black">Manage Deliveries</Link></li>
                <li><Link href="/orders" className="hover:text-black">Orders</Link></li>
                <li><Link href="/cart" className="hover:text-black">Payments</Link></li>
              </ul>
            </div>

            <div className="col-span-1 lg:col-span-2">
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-black">
                RESOURCES
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-black/60">
                <li><Link href="/shop" className="hover:text-black">Free eBooks</Link></li>
                <li><Link href="/shop" className="hover:text-black">Development Tutorial</Link></li>
                <li><Link href="/shop" className="hover:text-black">How to - Blog</Link></li>
                <li><Link href="/admin" className="hover:text-black">Staff Portal</Link></li>
              </ul>
            </div>
          </div>

          <hr className="my-8 border-black/10" />

          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-black/60">
              Shop.co © 2000-2026, All Rights Reserved
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {PAYMENT_LOGOS.map(({ name, Component }) => (
                <span
                  key={name}
                  title={name}
                  className="inline-flex h-[30px] w-[46px] items-center justify-center rounded-[5px] border border-black/10 bg-white px-1.5 shadow-2xs"
                >
                  <Component />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
