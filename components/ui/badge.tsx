// components/ui/badge.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-2xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:   "bg-paper-sunken text-ink-muted",
        outline:   "border border-border text-ink-muted",
        accent:    "bg-accent-subtle text-accent",
        success:   "bg-green-50 text-green-700",
        warning:   "bg-amber-50 text-amber-700",
        danger:    "bg-red-50 text-red-600",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
