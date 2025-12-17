'use client';

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

function ErrorAlert({ message, onDismiss, className }: ErrorAlertProps) {
  return (
    <div className={cn(
      "p-4 bg-red-950/50 border border-red-500/50 relative",
      className
    )}>
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="absolute top-2 right-2 text-red-400 hover:text-red-300 transition-colors"
        >
          <X size={16} />
        </button>
      )}
      <div className="flex items-start gap-3">
        <div className="text-red-400 mt-0.5 flex-shrink-0">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-1">Error</h4>
          <p className="text-sm text-red-300/90">{message}</p>
        </div>
      </div>
    </div>
  );
}

export { ErrorAlert }
