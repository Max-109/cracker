'use client';

import { Brain, Zap, Shield, MessageSquare, Cpu, Sparkles, Lock, Globe } from 'lucide-react';

const floatingIcons = [
  { icon: Brain, x: 8, y: 20, size: 56, blur: 0, opacity: 0.06, delay: 0 },
  { icon: Zap, x: 85, y: 12, size: 44, blur: 0, opacity: 0.07, delay: 1 },
  { icon: Shield, x: 10, y: 68, size: 50, blur: 0, opacity: 0.05, delay: 2 },
  { icon: MessageSquare, x: 88, y: 72, size: 48, blur: 0, opacity: 0.06, delay: 0.5 },
  { icon: Cpu, x: 15, y: 42, size: 40, blur: 0, opacity: 0.05, delay: 1.5 },
  { icon: Sparkles, x: 82, y: 42, size: 52, blur: 0, opacity: 0.06, delay: 2.5 },
  { icon: Lock, x: 5, y: 88, size: 36, blur: 0, opacity: 0.05, delay: 3 },
  { icon: Globe, x: 92, y: 28, size: 42, blur: 0, opacity: 0.05, delay: 1.8 },
];

export function FloatingIcons() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {floatingIcons.map((item, i) => (
        <div
          key={i}
          className="absolute animate-float-icon"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            filter: `blur(${item.blur}px)`,
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
    </div>
  );
}
