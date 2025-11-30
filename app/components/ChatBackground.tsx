'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Sparkles, Brain, Zap, Code, FileText, Lightbulb, Terminal } from 'lucide-react';

interface FloatingIcon {
  id: number;
  icon: typeof MessageSquare;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
}

export function ChatBackground() {
  const [icons, setIcons] = useState<FloatingIcon[]>([]);

  useEffect(() => {
    const iconComponents = [MessageSquare, Sparkles, Brain, Zap, Code, FileText, Lightbulb, Terminal];
    
    const generated: FloatingIcon[] = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      icon: iconComponents[i % iconComponents.length],
      x: Math.random() * 85 + 5,
      y: Math.random() * 80 + 5,
      size: Math.random() * 16 + 32,
      opacity: 0.04 + Math.random() * 0.02,
      delay: Math.random() * 8,
    }));
    setIcons(generated);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Grid - more visible */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--text-accent) 1px, transparent 1px), linear-gradient(90deg, var(--text-accent) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}
      />

      {/* Floating Icons */}
      {icons.map((item) => (
        <div
          key={item.id}
          className="absolute animate-float-icon-slow"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            opacity: item.opacity,
            animationDelay: `${item.delay}s`,
          }}
        >
          <item.icon 
            size={item.size} 
            className="text-[var(--text-accent)]"
            strokeWidth={1}
          />
        </div>
      ))}

      {/* Ambient glows - more visible */}
      <div 
        className="absolute -top-32 -left-32 w-[600px] h-[600px] opacity-[0.04] blur-[100px]"
        style={{ backgroundColor: 'var(--text-accent)' }}
      />
      <div 
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] opacity-[0.03] blur-[80px]"
        style={{ backgroundColor: 'var(--text-accent)' }}
      />

      {/* Corner accents - more visible */}
      <div className="absolute top-6 left-6 w-16 h-16 border-l-2 border-t-2 border-[var(--text-accent)]/10" />
      <div className="absolute top-6 right-6 w-16 h-16 border-r-2 border-t-2 border-[var(--text-accent)]/10" />
      <div className="absolute bottom-6 left-6 w-16 h-16 border-l-2 border-b-2 border-[var(--text-accent)]/10" />
      <div className="absolute bottom-6 right-6 w-16 h-16 border-r-2 border-b-2 border-[var(--text-accent)]/10" />

      {/* Side decorations */}
      <div className="absolute left-3 top-1/4 flex flex-col gap-1">
        {[3, 5, 2, 4, 3].map((h, i) => (
          <div
            key={i}
            className="w-1 bg-[var(--text-accent)] opacity-10"
            style={{ height: `${h * 4}px` }}
          />
        ))}
      </div>
      <div className="absolute right-3 bottom-1/4 flex flex-col gap-1">
        {[2, 4, 3, 5, 2].map((h, i) => (
          <div
            key={i}
            className="w-1 bg-[var(--text-accent)] opacity-10"
            style={{ height: `${h * 4}px` }}
          />
        ))}
      </div>
    </div>
  );
}
