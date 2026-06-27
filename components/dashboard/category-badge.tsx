// components/dashboard/category-badge.tsx
import { cn, CATEGORY_META } from "@/lib/utils";

interface CategoryBadgeProps {
  category: string;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.UNCATEGORISED;
  return (
    <span
      className={cn(
        "badge",
        meta.bg,
        meta.color,
        className
      )}
    >
      {meta.label}
    </span>
  );
}
