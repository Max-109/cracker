'use client';

import { Sparkles } from 'lucide-react';

export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center relative overflow-hidden">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--text-accent) 1px, transparent 1px), linear-gradient(90deg, var(--text-accent) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Corner Accents */}
      <div className="absolute top-8 left-8 w-20 h-20 border-l-2 border-t-2 border-[var(--text-accent)]/20" />
      <div className="absolute top-8 right-8 w-20 h-20 border-r-2 border-t-2 border-[var(--text-accent)]/20" />
      <div className="absolute bottom-8 left-8 w-20 h-20 border-l-2 border-b-2 border-[var(--text-accent)]/20" />
      <div className="absolute bottom-8 right-8 w-20 h-20 border-r-2 border-b-2 border-[var(--text-accent)]/20" />
      
      <div className="flex flex-col items-center gap-8 relative z-10">
        {/* Animated Logo */}
        <div className="relative">
          {/* Outer rings */}
          <div className="absolute -inset-8 border border-[var(--text-accent)]/10 auth-orbit" style={{ animationDuration: '8s' }} />
          <div className="absolute -inset-6 border border-[var(--text-accent)]/15 auth-orbit" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
          <div className="absolute -inset-4 border border-[var(--text-accent)]/20 auth-orbit" style={{ animationDuration: '4s' }} />
          
          {/* Main logo */}
          <div className="w-16 h-16 border-2 border-[var(--text-accent)] bg-[var(--text-accent)]/10 flex items-center justify-center relative overflow-hidden">
            <Sparkles size={26} className="text-[var(--text-accent)] animate-pulse" />
            {/* Inner scan effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--text-accent)]/30 to-transparent animate-scanline" style={{ animationDuration: '1.5s' }} />
          </div>
        </div>

        {/* Loading bars */}
        <div className="flex items-end gap-1 h-10">
          {[1, 2, 3, 4, 5].map((bar) => (
            <div
              key={bar}
              className="w-2 bg-[var(--text-accent)]"
              style={{ 
                height: `${bar * 8}px`,
                animation: `auth-typing 1s ease-in-out infinite`,
                animationDelay: `${bar * 80}ms`
              }}
            />
          ))}
        </div>
        
        {/* Loading text */}
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-[var(--text-accent)] animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Initializing
          </span>
          {/* Typing dots */}
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-1 bg-[var(--text-accent)] auth-typing-dot"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <div className="w-1.5 h-1.5 bg-[var(--text-accent)] animate-pulse" style={{ animationDelay: '200ms' }} />
        </div>
      </div>
    </div>
  );
}
