"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  LogOut,
  Menu,
  Package,
  Search,
  Shield,
  ShoppingCart,
  UserCircle2,
  X,
} from "lucide-react";
import { catalogApi } from "@/services/api";
import { useCustomerAuth } from "@/providers/CustomerAuthProvider";
import { useCart } from "@/providers/CartProvider";
import { toast } from "sonner";

export function StorefrontHeader() {
  const router = useRouter();
  const { customer, logout } = useCustomerAuth();
  const { cart } = useCart();

  const [showPromo, setShowPromo] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const { data: categoriesRes } = useQuery({
    queryKey: ["storefront-categories"],
    queryFn: () => catalogApi.getCategories(),
  });
  const categories = categoriesRes?.data ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    router.push(trimmed ? `/shop?search=${encodeURIComponent(trimmed)}` : "/shop");
    setMobileSearchOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setAccountMenuOpen(false);
    toast.success("Signed out successfully.");
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white">
      {/* Top Announcement Bar — 38px desktop / 34px mobile */}
      {showPromo && (
        <div className="bg-black text-white">
          <div className="relative mx-auto flex h-[34px] sm:h-[38px] max-w-[1240px] items-center justify-center px-4 text-xs sm:text-sm">
            <p className="truncate text-center">
              Sign up and get 20% off to your first order.{" "}
              <Link
                href={customer ? "/shop" : "/register"}
                className="font-medium underline underline-offset-4 hover:text-white/80"
              >
                Sign Up Now
              </Link>
            </p>
            <button
              type="button"
              onClick={() => setShowPromo(false)}
              aria-label="Close promotion bar"
              className="hidden sm:inline-flex absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/80 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Bar — 96px desktop / 64px mobile */}
      <div className="border-b border-black/10">
        <div className="mx-auto flex h-[64px] lg:h-[96px] max-w-[1240px] items-center justify-between gap-4 lg:gap-10 px-4 xl:px-0">
          {/* Left: Mobile Menu + Brand Wordmark */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              className="lg:hidden p-1 text-black cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link
              href="/"
              className="font-display text-[25px] lg:text-[32px] leading-none tracking-tight text-black"
            >
              SHOP.CO
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-base text-black">
            <div
              className="relative"
              onMouseEnter={() => setShopDropdownOpen(true)}
              onMouseLeave={() => setShopDropdownOpen(false)}
            >
              <Link
                href="/shop"
                className="inline-flex items-center gap-1 py-2 hover:text-black/70"
              >
                Shop
                <ChevronDown className="h-4 w-4" />
              </Link>

              {shopDropdownOpen && (
                <div className="absolute left-0 top-full z-50 w-64 rounded-2xl border border-black/10 bg-white p-3 shadow-lg">
                  <Link
                    href="/shop"
                    onClick={() => setShopDropdownOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-semibold text-black hover:bg-[#F0F0F0]"
                  >
                    All Products
                  </Link>
                  {categories.map((cat) => (
                    <div key={cat.id} className="mt-1">
                      <Link
                        href={`/category/${cat.slug}`}
                        onClick={() => setShopDropdownOpen(false)}
                        className="block rounded-lg px-3 py-1.5 text-sm font-medium text-black hover:bg-[#F0F0F0]"
                      >
                        {cat.name}
                      </Link>
                      {Array.isArray(cat.children) && cat.children.length > 0 && (
                        <div className="ml-3 border-l border-black/10 pl-2">
                          {cat.children.map((sub) => (
                            <Link
                              key={sub.id}
                              href={`/category/${sub.slug}`}
                              onClick={() => setShopDropdownOpen(false)}
                              className="block rounded-md px-2 py-1 text-xs text-black/65 hover:bg-[#F0F0F0] hover:text-black"
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link href="/shop?on_sale=1" className="whitespace-nowrap hover:text-black/70">
              On Sale
            </Link>
            <Link href="/shop?new_arrivals=1" className="whitespace-nowrap hover:text-black/70">
              New Arrivals
            </Link>
            <Link href="/shop?top_selling=1" className="whitespace-nowrap hover:text-black/70">
              Brands
            </Link>
          </nav>

          {/* Desktop Search Pill */}
          <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-[577px]">
            <div className="relative flex w-full items-center">
              <Search className="pointer-events-none absolute left-4 h-5 w-5 text-black/40" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products..."
                className="h-12 w-full rounded-full bg-[#F0F0F0] pl-12 pr-4 text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/15"
              />
            </div>
          </form>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setMobileSearchOpen((v) => !v)}
              aria-label="Search products"
              className="lg:hidden p-1 text-black cursor-pointer"
            >
              <Search className="h-6 w-6" />
            </button>

            <Link
              href="/cart"
              aria-label="Shopping cart"
              className="relative p-1 text-black hover:text-black/70"
            >
              <ShoppingCart className="h-6 w-6" />
              {cart.item_count > 0 && (
                <span className="absolute -right-1.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[11px] font-bold text-white">
                  {cart.item_count}
                </span>
              )}
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((v) => !v)}
                aria-label="Account menu"
                className="flex items-center gap-1.5 p-1 text-black hover:text-black/70 cursor-pointer"
              >
                <UserCircle2 className="h-6 w-6" />
              </button>

              {accountMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAccountMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
                    {customer ? (
                      <>
                        <div className="border-b border-black/10 px-3 py-2">
                          <p className="truncate text-sm font-semibold text-black">{customer.name}</p>
                          <p className="truncate text-xs text-black/60">{customer.email}</p>
                        </div>
                        <Link
                          href="/orders"
                          onClick={() => setAccountMenuOpen(false)}
                          className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-black hover:bg-[#F0F0F0]"
                        >
                          <Package className="h-4 w-4" /> My Orders
                        </Link>
                        <Link
                          href="/account"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-black hover:bg-[#F0F0F0]"
                        >
                          <UserCircle2 className="h-4 w-4" /> Profile
                        </Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#FF3333] hover:bg-[#FF3333]/10 cursor-pointer"
                        >
                          <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          onClick={() => setAccountMenuOpen(false)}
                          className="block rounded-lg px-3 py-2 text-sm font-medium text-black hover:bg-[#F0F0F0]"
                        >
                          Customer Sign In
                        </Link>
                        <Link
                          href="/register"
                          onClick={() => setAccountMenuOpen(false)}
                          className="block rounded-lg px-3 py-2 text-sm text-black hover:bg-[#F0F0F0]"
                        >
                          Create Account
                        </Link>
                      </>
                    )}
                    <div className="mt-1 border-t border-black/10 pt-1">
                      <Link
                        href="/admin"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-black/70 hover:bg-[#F0F0F0] hover:text-black"
                      >
                        <Shield className="h-3.5 w-3.5" /> Staff Admin Panel
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Expandable Search */}
        {mobileSearchOpen && (
          <form onSubmit={handleSearch} className="border-t border-black/10 px-4 py-3 lg:hidden">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-4 h-4 w-4 text-black/40" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products..."
                autoFocus
                className="h-11 w-full rounded-full bg-[#F0F0F0] pl-11 pr-4 text-sm text-black placeholder:text-black/40 focus:outline-none"
              />
            </div>
          </form>
        )}

        {/* Mobile Slide-Down Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-black/10 bg-white px-4 py-4 lg:hidden">
            <nav className="flex flex-col space-y-2 text-base font-medium">
              <Link
                href="/shop"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-2 hover:bg-[#F0F0F0]"
              >
                Shop All
              </Link>
              <Link
                href="/shop?on_sale=1"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-2 hover:bg-[#F0F0F0]"
              >
                On Sale
              </Link>
              <Link
                href="/shop?new_arrivals=1"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-2 hover:bg-[#F0F0F0]"
              >
                New Arrivals
              </Link>
              <div className="border-t border-black/10 pt-2">
                <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-black/50">
                  Dress Styles
                </p>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg px-2 py-1.5 text-sm text-black/80 hover:bg-[#F0F0F0]"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
              <div className="border-t border-black/10 pt-2">
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-black/70 hover:bg-[#F0F0F0]"
                >
                  <Shield className="h-4 w-4" /> Staff Admin Panel
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
