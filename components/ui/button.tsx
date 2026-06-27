import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded font-medium text-sm transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:   "bg-accent text-white hover:bg-accent-hover shadow-sm",
        secondary: "bg-paper-sunken text-ink hover:bg-border",
        ghost:     "text-ink hover:bg-paper-sunken",
        outline:   "border border-border bg-paper-raised text-ink hover:bg-paper-sunken",
        danger:    "bg-red-500 text-white hover:bg-red-600",
        link:      "text-accent underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm:   "h-7  px-2.5 text-xs",
        md:   "h-9  px-3",
        lg:   "h-10 px-5 text-base",
        icon: "h-8  w-8  p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size:    "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
