import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

export function LoadingIndicator({ className }: { className?: string }) {
  // Generate 16 dots (4x4 grid) with random timing
  // useMemo ensures values stay fixed after first render (no jitter)
  const dots = useMemo(() => {
    return Array.from({ length: 16 }).map(() => ({
      // Random duration between 3s and 6s (slower = rarer flashes)
      duration: 3 + Math.random() * 3,
      // Negative delay starts animation "in the past" so we don't wait
      delay: -(Math.random() * 5),
    }));
  }, []);

  return (
    <div className={cn("flex items-center", className)}>
      <div className="thinking-grid">
        {dots.map((dot, i) => (
          <div
            key={i}
            className="thinking-dot"
            style={{
              animationDuration: `${dot.duration}s`,
              animationDelay: `${dot.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
