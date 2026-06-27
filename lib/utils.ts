// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui standard utility for merging Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a date as "Jun 23" or "Yesterday" or "Today"
export function formatDate(date: Date | string | null): string {
  if (!date) return "Unknown date";
  const d   = new Date(date);
  const now = new Date();
  const diffMs   = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)  return `${diffDays} days ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Truncate a string to n characters with ellipsis
export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

// Get favicon URL for a given feed URL
export function getFaviconUrl(url: string): string {
  try {
    const { origin } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
  } catch {
    return "/favicon.ico";
  }
}

// Category display metadata
export const CATEGORY_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  TECHNICAL:     { label: "Technical",     color: "text-[#0369a1]", bg: "bg-[#f0f9ff]" },
  BUSINESS:      { label: "Business",      color: "text-[#854d0e]", bg: "bg-[#fefce8]" },
  TRENDS:        { label: "Trends",        color: "text-[#7e22ce]", bg: "bg-[#fdf4ff]" },
  TOOLS:         { label: "Tools",         color: "text-[#166534]", bg: "bg-[#f0fdf4]" },
  NEWS:          { label: "News",          color: "text-[#c2410c]", bg: "bg-[#fff7ed]" },
  UNCATEGORISED: { label: "General",       color: "text-[#6b6b6b]", bg: "bg-[#f3f3f1]" },
};

// Importance dot colour
export const IMPORTANCE_COLOR: Record<number, string> = {
  5: "bg-red-500",
  4: "bg-orange-500",
  3: "bg-blue-500",
  2: "bg-slate-400",
  1: "bg-slate-200",
};
