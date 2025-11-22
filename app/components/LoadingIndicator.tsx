import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

const STATES = ["PROCESSING", "BUILDING", "COMPILING", "DEPLOYING"];

export function LoadingIndicator({ label, className }: { label?: string; className?: string }) {
  const status = useMemo(() => label || STATES[Math.floor(Math.random() * STATES.length)], [label]);

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="thinking-loader">
        <div className="thinking-track">
          {Array.from({ length: 10 }).map((_, idx) => (
            <span key={idx} />
          ))}
        </div>

        {[4, 3, 2, 1].map((i) => (
          <div
            key={`tail-${i}`}
            className="thinking-runner thinking-tail"
            style={{ ['--i' as string]: i } as React.CSSProperties}
          />
        ))}

        <div className="thinking-runner thinking-head" />
      </div>

      <div className="flex flex-col leading-tight">
        <span className="text-[var(--text-accent)] font-semibold tracking-[0.18em] text-xs uppercase">
          {status}
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
          system live
        </span>
      </div>
    </div>
  );
}
