import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "$0";
  }
  const num = Number(amount);
  if (Number.isNaN(num)) {
    return "$0";
  }
  return Number.isInteger(num)
    ? `$${num.toLocaleString("en-US")}`
    : `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatExactMoney(amount: string | number | null | undefined): string {
  const num = Number(amount ?? 0);
  if (Number.isNaN(num)) {
    return "$0.00";
  }
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const COLOR_HEX_MAP: Record<string, string> = {
  Green: "#00C12B",
  Red: "#F50606",
  Yellow: "#F5DD06",
  Orange: "#F57906",
  Cyan: "#06CAF5",
  Blue: "#063AF5",
  Purple: "#7D06F5",
  Pink: "#F506A4",
  White: "#FFFFFF",
  Black: "#000000",
  Olive: "#4F4631",
  Navy: "#31344F",
};

export function getColorHex(colorName: string): string {
  if (colorName.startsWith("#")) {
    return colorName;
  }
  return COLOR_HEX_MAP[colorName] ?? "#111111";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
