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
  const [darkMode, setDarkMode] = useState(false);

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
    return () => root.classList.remove("dark");
  }, [darkMode]);

  if (loading || !staff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">Verifying staff session...</p>
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
    router.push("/admin/login");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-900 border-r border-black/10 dark:border-zinc-800">
      <div className="flex h-16 items-center justify-between border-b border-black/10 dark:border-zinc-800 px-5">
        <Link href="/admin" className="font-display text-xl tracking-tight text-black dark:text-white">
          SHOP.CO <span className="font-sans text-xs font-semibold text-black/50 dark:text-zinc-400">ADMIN</span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 text-black/60 dark:text-zinc-400 cursor-pointer"
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
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-black/70 hover:bg-black/5 hover:text-black dark:text-zinc-300 dark:hover:bg-zinc-800",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-black/10 dark:border-zinc-800 p-4 space-y-3">
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3">
          <p className="truncate text-sm font-semibold text-black dark:text-white">{staff.name}</p>
          <p className="truncate text-xs text-black/55 dark:text-zinc-400">{staff.email}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(staff.roles ?? []).map((r) => (
              <Badge key={r.id} variant={r.is_super_admin ? "default" : "secondary"} className="text-[10px]">
                {r.name}
              </Badge>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 dark:border-zinc-700 py-2 text-xs font-medium text-[#FF3333] hover:bg-[#FF3333]/10 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-zinc-50 text-black dark:bg-zinc-950 dark:text-zinc-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-64">{sidebarContent}</div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-black/10 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-4 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs */}
            <nav aria-label="Admin breadcrumbs" className="flex items-center gap-1.5 text-sm truncate">
              {segments.map((seg, i) => (
                <React.Fragment key={`${seg}-${i}`}>
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-black/40 dark:text-zinc-500" />}
                  <span
                    className={cn(
                      "capitalize",
                      i === segments.length - 1
                        ? "font-semibold text-black dark:text-white"
                        : "text-black/55 dark:text-zinc-400",
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
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-black/15 dark:border-zinc-700 px-3.5 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-zinc-800"
            >
              View Storefront <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle dark mode"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/15 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
