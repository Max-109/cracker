'use client';

import * as React from "react"
import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  const [shouldRender, setShouldRender] = useState(open);

  useEffect(() => {
    if (open) {
      // Use requestAnimationFrame to avoid synchronous setState warning
      requestAnimationFrame(() => setShouldRender(true));
    }
  }, [open]);

  const handleAnimationEnd = () => {
    if (!open) setShouldRender(false);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200",
        open ? "opacity-100" : "opacity-0"
      )}
      onTransitionEnd={handleAnimationEnd}
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "bg-[var(--bg-sidebar-solid)] border border-[var(--border-color)] w-[90%] max-w-md transition-all duration-200 transform",
          open ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

function DialogHeader({ children, className, onClose }: DialogHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between p-6 pb-0", className)}>
      <div>{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <h3 className={cn("text-lg font-semibold text-[var(--text-primary)]", className)}>
      {children}
    </h3>
  );
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

function DialogDescription({ children, className }: DialogDescriptionProps) {
  return (
    <p className={cn("text-sm text-[var(--text-secondary)] mt-2", className)}>
      {children}
    </p>
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

function DialogContent({ children, className }: DialogContentProps) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn("flex justify-end gap-2 p-6 pt-0", className)}>
      {children}
    </div>
  );
}

export {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter
}
