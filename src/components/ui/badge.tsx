import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-black text-white dark:bg-white dark:text-black",
        secondary: "border-transparent bg-[#F0F0F0] text-black dark:bg-zinc-800 dark:text-zinc-100",
        destructive: "border-transparent bg-[#FF3333]/10 text-[#FF3333]",
        success: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        warning: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
        info: "border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-400",
        outline: "border-black/15 text-black dark:border-zinc-700 dark:text-zinc-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
