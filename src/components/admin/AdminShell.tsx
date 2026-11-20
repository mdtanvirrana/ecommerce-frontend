"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  ShieldCheck,
  ShoppingBag,
  Star,
  Sun,
  Tag,
  UserCog,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, permissions: ["reports.view"] },
  { label: "Products", href: "/admin/products", icon: Package, permissions: ["products.view"] },
  { label: "Categories", href: "/admin/categories", icon: FolderTree, permissions: ["categories.view"] },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag, permissions: ["orders.view"] },
  { label: "Reviews & Ratings", href: "/admin/reviews", icon: Star, permissions: ["reviews.view"] },
  { label: "Coupons", href: "/admin/coupons", icon: Tag, permissions: ["coupons.view", "coupons.manage"] },
  { label: "Customers", href: "/admin/customers", icon: Users, permissions: ["customers.view"] },
  { label: "Staff", href: "/admin/staff", icon: UsersRound, permissions: ["staff.view"] },
  { label: "Roles & RBAC", href: "/admin/roles", icon: ShieldCheck, permissions: ["roles.view", "permissions.assign"] },
  { label: "Profile", href: "/admin/profile", icon: UserCog },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { staff, loading, logout, hasAnyPermission } = useAdminAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("shopco_admin_dark") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!loading && !staff) {
      router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, staff, router, pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      window.localStorage.setItem("shopco_admin_dark", darkMode ? "1" : "0");
    } catch {
      // Ignore storage errors
    }
    return () => root.classList.remove("dark");
  }, [darkMode]);

  if (loading || !staff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-muted-foreground">Verifying staff session...</p>
      </div>
    );
  }

  // Dynamically hide unauthorized sidebar items based on database-driven permissions
  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.permissions || hasAnyPermission(item.permissions),
  );

  const segments = pathname.split("/").filter(Boolean);

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out of Admin Panel.");
    window.location.assign("/admin/login");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white text-zinc-950 dark:bg-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5">
        <Link
          href="/admin"
          className="font-display text-xl tracking-tight text-zinc-950 dark:text-white"
        >
          SHOP.CO{" "}
          <span className="font-sans text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            ADMIN
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          className="lg:hidden rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
        <div className="rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 p-3">
          <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
            {staff.name}
          </p>
          <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">{staff.email}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(staff.roles ?? []).map((r) => (
              <Badge
                key={r.id}
                variant={r.is_super_admin ? "default" : "secondary"}
                className="text-[10px]"
              >
                {r.name}
              </Badge>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2 text-xs font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-700 dark:hover:bg-red-500/20 dark:hover:text-red-300 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Fixed Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden lg:block w-64">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-64 h-full">{sidebarContent}</div>
          <div
            className="flex-1 bg-black/60 backdrop-blur-[1px]"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Fixed Top Header */}
      <header className="fixed top-0 left-0 lg:left-64 right-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-4 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="lg:hidden rounded-lg p-1.5 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <nav
            aria-label="Admin breadcrumbs"
            className="flex items-center gap-1.5 text-sm truncate"
          >
            {segments.map((seg, i) => (
              <React.Fragment key={`${seg}-${i}`}>
                {i > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                )}
                <span
                  className={cn(
                    "capitalize",
                    i === segments.length - 1
                      ? "font-semibold text-zinc-950 dark:text-white"
                      : "text-zinc-500 dark:text-zinc-400",
                  )}
                >
                  {seg}
                </span>
              </React.Fragment>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            View Storefront <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Scrollable Main Content Offset by Fixed Sidebar & Fixed Header */}
      <div className="flex min-h-screen flex-col lg:pl-64 pt-16">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
