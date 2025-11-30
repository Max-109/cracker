'use client';

import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

export function AuthBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generated: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 15,
    }));
    setParticles(generated);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Animated Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--text-accent) 1px, transparent 1px), linear-gradient(90deg, var(--text-accent) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Animated Scan Line */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--text-accent)] to-transparent opacity-20 animate-scanline"
        />
      </div>

      {/* Floating Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute bg-[var(--text-accent)] animate-float-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            opacity: 0.15,
          }}
        />
      ))}

      {/* Corner Accents */}
      <div className="absolute top-8 left-8 w-20 h-20 border-l-2 border-t-2 border-[var(--text-accent)]/20" />
      <div className="absolute top-8 right-8 w-20 h-20 border-r-2 border-t-2 border-[var(--text-accent)]/20" />
      <div className="absolute bottom-8 left-8 w-20 h-20 border-l-2 border-b-2 border-[var(--text-accent)]/20" />
      <div className="absolute bottom-8 right-8 w-20 h-20 border-r-2 border-b-2 border-[var(--text-accent)]/20" />

      {/* Ambient Glow */}
      <div 
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-[0.03] blur-[100px]"
        style={{ backgroundColor: 'var(--text-accent)' }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-[0.02] blur-[80px]"
        style={{ backgroundColor: 'var(--text-accent)' }}
      />

      {/* Decorative Tech Elements */}
      <div className="absolute top-1/3 left-12 hidden lg:flex flex-col gap-2">
        {[4, 3, 5, 2, 4, 3].map((h, i) => (
          <div
            key={i}
            className="w-1 bg-[var(--text-accent)] animate-pulse"
            style={{
              height: `${h * 4}px`,
              opacity: 0.2,
              animationDelay: `${i * 0.15}s`
            }}
          />
        ))}
      </div>

      <div className="absolute top-1/2 right-12 hidden lg:flex flex-col gap-2">
        {[3, 5, 2, 4, 3, 5].map((h, i) => (
          <div
            key={i}
            className="w-1 bg-[var(--text-accent)] animate-pulse"
            style={{
              height: `${h * 4}px`,
              opacity: 0.2,
              animationDelay: `${i * 0.15 + 0.5}s`
            }}
          />
        ))}
      </div>

      {/* Data Stream Effect on sides */}
      <div className="absolute left-4 top-1/4 bottom-1/4 hidden lg:block">
        <div className="h-full w-px bg-gradient-to-b from-transparent via-[var(--text-accent)]/30 to-transparent animate-data-stream" />
      </div>
      <div className="absolute right-4 top-1/3 bottom-1/3 hidden lg:block">
        <div className="h-full w-px bg-gradient-to-b from-transparent via-[var(--text-accent)]/30 to-transparent animate-data-stream" style={{ animationDelay: '2s' }} />
      </div>
    </div>
  );
}
