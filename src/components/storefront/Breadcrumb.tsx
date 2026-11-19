import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="py-5 text-sm sm:text-base">
      <ol className="flex flex-wrap items-center gap-1.5 text-black/60">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="inline-flex items-center gap-1.5">
              {idx > 0 && <ChevronRight className="h-4 w-4 text-black/40" />}
              {isLast || !item.href ? (
                <span className="font-medium text-black">{item.label}</span>
              ) : (
                <Link href={item.href} className="hover:text-black transition-colors">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
