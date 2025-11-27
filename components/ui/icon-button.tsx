import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const iconButtonVariants = cva(
  "inline-flex items-center justify-center border transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 outline-none group hover-glow",
  {
    variants: {
      variant: {
        default: "border-[var(--border-color)] bg-[#141414] text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]",
        primary: "border-[var(--text-accent)] bg-[var(--text-accent)] text-black hover:bg-black hover:text-[var(--text-accent)]",
        ghost: "border-transparent bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]",
        danger: "border-[var(--border-color)] bg-[#141414] text-[var(--text-secondary)] hover:border-red-500 hover:text-red-500 hover-glow-danger",
        accent: "border-[var(--text-accent)] bg-black text-[var(--text-accent)] hover:bg-[var(--text-accent)] hover:text-black",
      },
      size: {
        sm: "w-8 h-8",
        default: "w-9 h-9",
        lg: "w-10 h-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  rotateOnHover?: boolean;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, rotateOnHover, children, ...props }, ref) => {
    return (
      <button
        type="button"
        ref={ref}
        className={cn(iconButtonVariants({ variant, size, className }))}
        {...props}
      >
        {rotateOnHover ? (
          <span className="group-hover:rotate-12 transition-transform duration-300">
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)
IconButton.displayName = "IconButton"

export { IconButton, iconButtonVariants }
