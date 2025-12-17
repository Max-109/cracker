'use client';

import * as React from "react"
import { cn } from "@/lib/utils"

interface BackdropProps {
  onClick?: () => void;
  className?: string;
  blur?: boolean;
  dark?: boolean;
}

const Backdrop = React.forwardRef<HTMLDivElement, BackdropProps>(
  ({ onClick, className, blur = false, dark = false }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-10",
          blur && "backdrop-blur-sm",
          dark && "bg-black/50",
          className
        )}
        onClick={onClick}
      />
    )
  }
)
Backdrop.displayName = "Backdrop"

export { Backdrop }
