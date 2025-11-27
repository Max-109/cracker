'use client';

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
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

interface Position {
  top: number;
  left: number;
  transformOrigin: string;
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
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<Position>({ top: 0, left: 0, transformOrigin: 'top left' });
  const [hasPositioned, setHasPositioned] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !contentRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;

    let top: number;
    let left: number;
    let transformOrigin: string;

    // Vertical positioning
    if (position === 'top') {
      top = triggerRect.top - contentRect.height - 4;
      // If not enough space above, flip to bottom
      if (top < padding) {
        top = triggerRect.bottom + 4;
        transformOrigin = 'top';
      } else {
        transformOrigin = 'bottom';
      }
    } else {
      top = triggerRect.bottom + 4;
      // If not enough space below, flip to top
      if (top + contentRect.height > viewportHeight - padding) {
        top = triggerRect.top - contentRect.height - 4;
        transformOrigin = 'bottom';
      } else {
        transformOrigin = 'top';
      }
    }

    // Horizontal positioning
    if (align === 'right') {
      // Align right edge of dropdown with right edge of trigger
      left = triggerRect.right - contentRect.width;
      // If goes off left edge, adjust
      if (left < padding) {
        left = padding;
      }
      transformOrigin += ' right';
    } else {
      // Align left edge of dropdown with left edge of trigger
      left = triggerRect.left;
      // If goes off right edge, adjust
      if (left + contentRect.width > viewportWidth - padding) {
        left = viewportWidth - contentRect.width - padding;
      }
      transformOrigin += ' left';
    }

    // Clamp to viewport
    top = Math.max(padding, Math.min(top, viewportHeight - contentRect.height - padding));
    left = Math.max(padding, Math.min(left, viewportWidth - contentRect.width - padding));

    setPos({ top, left, transformOrigin });
    setHasPositioned(true);
  }, [align, position]);

  // Update position when opening
  useEffect(() => {
    if (isOpen && mounted) {
      setHasPositioned(false);
      // Use requestAnimationFrame to ensure content is rendered before measuring
      requestAnimationFrame(() => {
        updatePosition();
      });
    }
  }, [isOpen, mounted, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || contentRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    // Use capture phase to handle clicks before they're stopped
    document.addEventListener('mousedown', handleClick, true);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // Close on scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => setIsOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  const handleTriggerClick = () => {
    setIsOpen(prev => !prev);
  };

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <div className={cn("relative", className)} ref={triggerRef}>
      <div onClick={handleTriggerClick}>
        {trigger}
      </div>

      {mounted && isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={close}
            aria-hidden="true"
          />
          {/* Content */}
          <div
            ref={contentRef}
            role="menu"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
              transformOrigin: pos.transformOrigin,
            }}
            className={cn(
              "bg-[var(--bg-sidebar)] border border-[var(--border-color)] overflow-hidden p-1 shadow-xl",
              "animate-in fade-in zoom-in-95 duration-100",
              !hasPositioned && "opacity-0",
              contentClassName
            )}
          >
            {typeof children === 'function' ? children(close) : children}
          </div>
        </>,
        document.body
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
        "flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] px-3 py-2 border border-[var(--border-color)] hover:border-[var(--border-active)] transition-colors uppercase tracking-[0.16em]",
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
