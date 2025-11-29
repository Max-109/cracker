'use client';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Animated bars loader */}
        <div className="flex items-end gap-1 h-10">
          {[1, 2, 3, 4, 5].map((bar) => (
            <div
              key={bar}
              className="w-2 bg-[var(--text-accent)] animate-pulse"
              style={{ 
                height: `${bar * 8}px`,
                animationDelay: `${bar * 80}ms`,
                animationDuration: '0.8s'
              }}
            />
          ))}
        </div>
        
        {/* Loading text */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[var(--text-accent)] animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Loading
          </span>
          <div className="w-1.5 h-1.5 bg-[var(--text-accent)] animate-pulse" style={{ animationDelay: '200ms' }} />
        </div>
      </div>
    </div>
  );
}
