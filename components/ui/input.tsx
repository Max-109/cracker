import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-[var(--text-secondary)] selection:bg-[var(--text-accent)] selection:text-black h-9 w-full min-w-0 border border-[var(--border-color)] bg-[#141414] px-3 py-2 text-sm font-mono tracking-tight transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm rounded-none",
        "focus-visible:border-[var(--border-active)] focus-visible:ring-0",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
