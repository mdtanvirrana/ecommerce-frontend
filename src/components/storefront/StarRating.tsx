import React from "react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number | string;
  showText?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StarRating({
  rating,
  showText = true,
  size = "sm",
  className,
}: StarRatingProps) {
  const numeric = Math.max(0, Math.min(5, Number(rating) || 0));
  const fullStars = Math.floor(numeric);
  const hasHalf = numeric - fullStars >= 0.25 && numeric - fullStars < 0.75;
  const roundedFull = numeric - fullStars >= 0.75 ? fullStars + 1 : fullStars;
  const iconSize = size === "md" ? "h-5 w-5" : "h-[18px] w-[18px]";

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div className="inline-flex items-center gap-1" aria-label={`${numeric.toFixed(1)} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < roundedFull) {
            return (
              <svg key={i} className={iconSize} viewBox="0 0 20 20" fill="#FFC633">
                <path d="M10 1.25l2.62 5.31 5.86.85-4.24 4.13 1 5.84L10 14.62l-5.24 2.76 1-5.84-4.24-4.13 5.86-.85L10 1.25z" />
              </svg>
            );
          }
          if (i === roundedFull && hasHalf) {
            return (
              <svg key={i} className={iconSize} viewBox="0 0 20 20" fill="none">
                <defs>
                  <clipPath id={`half-star-${i}-${numeric}`}>
                    <rect x="0" y="0" width="10" height="20" />
                  </clipPath>
                </defs>
                <path
                  d="M10 1.25l2.62 5.31 5.86.85-4.24 4.13 1 5.84L10 14.62l-5.24 2.76 1-5.84-4.24-4.13 5.86-.85L10 1.25z"
                  fill="#FFC633"
                  clipPath={`url(#half-star-${i}-${numeric})`}
                />
              </svg>
            );
          }
          return null;
        })}
      </div>
      {showText && (
        <span className="text-xs sm:text-sm text-black">
          {numeric.toFixed(1)}
          <span className="text-black/60">/5</span>
        </span>
      )}
    </div>
  );
}
