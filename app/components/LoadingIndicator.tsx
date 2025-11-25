import React from 'react';
import { cn } from '@/lib/utils';

export function LoadingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
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
    </div>
  );
}
