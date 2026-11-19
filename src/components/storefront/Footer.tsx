"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { toast } from "sonner";

export function StorefrontFooter() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    toast.success("Subscribed! Use code WELCOME20 for 20% off your first order.");
    setEmail("");
  };

  return (
    <footer className="mt-16 sm:mt-20">
      {/* Overlapping Black Newsletter Banner matching Figma */}
      <div className="relative z-10 mx-auto max-w-[1240px] px-4 xl:px-0">
        <div className="-mb-[145px] sm:-mb-[90px] rounded-[20px] bg-black px-6 py-8 sm:px-16 sm:py-9 text-white">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <h2 className="font-display max-w-[551px] text-[32px] leading-[1.1] sm:text-[40px]">
              STAY UPTO DATE ABOUT OUR LATEST OFFERS
            </h2>
            <form
              onSubmit={handleSubscribe}
              className="flex w-full flex-col gap-3 sm:max-w-[349px]"
            >
              <div className="relative flex items-center">
                <Mail className="pointer-events-none absolute left-4 h-5 w-5 text-black/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="h-12 w-full rounded-full bg-white pl-12 pr-4 text-sm text-black placeholder:text-black/40 focus:outline-none"
                />
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
              <Link href="/" className="font-display text-[28px] sm:text-[33px] leading-none text-black">
                SHOP.CO
              </Link>
              <p className="mt-4 max-w-[260px] text-sm leading-relaxed text-black/60">
                We have clothes that suits your style and which you&apos;re proud to wear. From women to men.
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
            <div className="flex items-center gap-2.5">
              {["VISA", "MC", "PayPal", "Apple Pay", "G Pay"].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex h-[30px] items-center justify-center rounded-md border border-black/10 bg-white px-2.5 text-[11px] font-bold tracking-tight text-black shadow-2xs"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
