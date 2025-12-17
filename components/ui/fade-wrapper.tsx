'use client';

import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface FadeWrapperProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  isAbsolute?: boolean;
  duration?: number;
}

function FadeWrapper({ 
  show, 
  children, 
  className, 
  isAbsolute = false,
  duration = 300 
}: FadeWrapperProps) {
  const [shouldRender, setShouldRender] = useState(show);
  const [isFadingIn, setIsFadingIn] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (show) {
      // Use requestAnimationFrame to avoid synchronous setState warning
      requestAnimationFrame(() => {
        setShouldRender(true);
        requestAnimationFrame(() => setIsFadingIn(true));
      });
    } else {
      requestAnimationFrame(() => setIsFadingIn(false));
      timeout = setTimeout(() => setShouldRender(false), duration);
    }
    return () => { if (timeout) clearTimeout(timeout); };
  }, [show, duration]);

  if (!shouldRender) return null;

  return (
    <div 
      className={cn(
        "transition-opacity",
        isAbsolute ? "absolute inset-0 w-full h-full" : "relative",
        isFadingIn ? "opacity-100" : "opacity-0",
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

export { FadeWrapper }
