// components/dashboard/importance-dot.tsx
import { cn, IMPORTANCE_COLOR } from "@/lib/utils";

interface ImportanceDotProps {
  importance: number;
  className?: string;
}

const LABELS: Record<number, string> = {
  5: "Must read",
  4: "Very relevant",
  3: "Worth knowing",
  2: "Minor update",
  1: "Low signal",
};

export function ImportanceDot({ importance, className }: ImportanceDotProps) {
  const color = IMPORTANCE_COLOR[importance] ?? IMPORTANCE_COLOR[3];
  return (
    <span
      title={LABELS[importance] ?? ""}
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0 mt-[3px]",
        color,
        className
      )}
    />
  );
}
