'use client';

import * as React from "react"
import { useRef, useEffect, useImperativeHandle } from "react"
import { cn } from "@/lib/utils"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean;
  maxHeight?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize = false, maxHeight = 200, value, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    
    useImperativeHandle(ref, () => internalRef.current!);

    useEffect(() => {
      if (autoResize && internalRef.current) {
        internalRef.current.style.height = 'inherit';
        const scrollHeight = internalRef.current.scrollHeight;
        internalRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      }
    }, [value, autoResize, maxHeight]);

    return (
      <textarea
        ref={internalRef}
        value={value}
        className={cn(
          "w-full bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] placeholder:italic leading-relaxed resize-none focus:outline-none min-h-[24px] scrollbar-custom",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea }
