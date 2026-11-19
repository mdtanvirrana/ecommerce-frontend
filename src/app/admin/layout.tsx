import React from "react";
import { AdminAuthProvider } from "@/providers/AdminAuthProvider";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
