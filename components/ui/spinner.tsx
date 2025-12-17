import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const spinnerVariants = cva(
  "border-2 border-t-transparent rounded-full animate-spin",
  {
    variants: {
      variant: {
        default: "border-[var(--text-secondary)]",
        accent: "border-[var(--text-accent)]",
        white: "border-white",
      },
      size: {
        xs: "w-3 h-3",
        sm: "w-4 h-4",
        default: "w-5 h-5",
        lg: "w-6 h-6",
        xl: "w-8 h-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
}

function Spinner({ variant, size, className }: SpinnerProps) {
  return (
    <div className={cn(spinnerVariants({ variant, size, className }))} />
  );
}

export { Spinner, spinnerVariants }
