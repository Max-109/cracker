'use client';

import * as React from "react"
import { useState, useCallback } from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: 'left' | 'right';
  position?: 'bottom' | 'top';
  className?: string;
  contentClassName?: string;
}

function Dropdown({
  trigger,
  children,
  align = 'left',
  position = 'bottom',
  className,
  contentClassName
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  const handleTriggerClick = () => {
    setIsOpen(prev => !prev);
  };

  // Position classes based on align and position props
  const positionClasses = cn(
    "absolute mt-1",
    position === 'top' ? "bottom-full mb-1" : "top-full",
    align === 'right' ? "right-0" : "left-0",
    position === 'top'
      ? "origin-bottom-right animate-in fade-in slide-in-from-bottom-2 duration-100"
      : "origin-top-left animate-in fade-in zoom-in-95 duration-100"
  );

  return (
    <div className={cn("relative", className)}>
      <div onClick={handleTriggerClick}>
        {trigger}
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={close}
            aria-hidden="true"
          />
          {/* Content */}
          <div
            role="menu"
            className={cn(
              positionClasses,
              "bg-[var(--bg-sidebar-solid)] border border-[var(--border-color)] overflow-hidden p-1 shadow-xl z-[9999]",
              contentClassName
            )}
          >
            {typeof children === 'function' ? children(close) : children}
          </div>
        </>
      )}
    </div>
  );
}

interface DropdownTriggerProps {
  children: React.ReactNode;
  className?: string;
  showChevron?: boolean;
  isHydrated?: boolean;
}

function DropdownTrigger({ children, className, showChevron = true, isHydrated = true }: DropdownTriggerProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] px-3 py-2 border border-[var(--border-color)] hover-glow uppercase tracking-[0.16em]",
        className
      )}
    >
      <span className={cn(!isHydrated && "opacity-0")}>{children}</span>
      {showChevron && <ChevronDown size={16} className="text-[var(--text-secondary)]" />}
    </button>
  );
}

interface DropdownLabelProps {
  children: React.ReactNode;
  className?: string;
}

function DropdownLabel({ children, className }: DropdownLabelProps) {
  return (
    <div className={cn(
      "px-2 py-1.5 text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]",
      className
    )}>
      {children}
    </div>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  description?: string;
  className?: string;
}

function DropdownItem({ children, onClick, selected, description, className }: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full text-left px-3 py-2 hover:bg-[#1e1e1e] text-sm transition-colors",
        className
      )}
    >
      <div className="flex flex-col">
        <span className="text-[var(--text-primary)] font-semibold uppercase tracking-[0.12em]">{children}</span>
        {description && (
          <span className="text-[var(--text-secondary)] text-[11px]">{description}</span>
        )}
      </div>
      {selected && <Check size={16} className="text-[var(--text-accent)]" />}
    </button>
  );
}

function DropdownDivider() {
  return <div className="my-1 border-t border-[var(--border-color)]" />;
}

export {
  Dropdown,
  DropdownTrigger,
  DropdownLabel,
  DropdownItem,
  DropdownDivider
}
