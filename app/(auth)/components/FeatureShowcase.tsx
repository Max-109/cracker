'use client';

import { Brain, Zap, Shield, Sparkles, MessageSquare, Settings2 } from 'lucide-react';

const features = [
  { icon: Brain, label: 'Reasoning', desc: 'Deep thinking models' },
  { icon: Zap, label: 'Fast', desc: 'Token streaming' },
  { icon: Shield, label: 'Private', desc: 'Invitation only' },
  { icon: MessageSquare, label: 'Multi-Model', desc: '100+ AI models' },
];

export function FeatureShowcase({ side = 'left' }: { side?: 'left' | 'right' }) {
  return (
    <div className={`hidden xl:flex flex-col justify-center gap-6 ${side === 'left' ? 'items-end pr-12' : 'items-start pl-12'}`}>
      {features.map((feature, i) => (
        <div
          key={feature.label}
          className="flex items-center gap-4 group animate-in fade-in slide-in-from-left duration-500"
          style={{ animationDelay: `${i * 100 + 200}ms` }}
        >
          {side === 'right' && (
            <div className="w-10 h-10 border border-[var(--border-color)] bg-[#1a1a1a] flex items-center justify-center group-hover:border-[var(--text-accent)]/50 transition-colors">
              <feature.icon size={18} className="text-[var(--text-secondary)] group-hover:text-[var(--text-accent)] transition-colors" />
            </div>
          )}
          <div className={side === 'left' ? 'text-right' : 'text-left'}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-accent)] font-semibold">
              {feature.label}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
              {feature.desc}
            </p>
          </div>
          {side === 'left' && (
            <div className="w-10 h-10 border border-[var(--border-color)] bg-[#1a1a1a] flex items-center justify-center group-hover:border-[var(--text-accent)]/50 transition-colors">
              <feature.icon size={18} className="text-[var(--text-secondary)] group-hover:text-[var(--text-accent)] transition-colors" />
            </div>
          )}
        </div>
      ))}

      {/* Tech Decorations */}
      <div className="mt-8 flex items-center gap-2">
        <div className="w-2 h-2 bg-[var(--text-accent)]/30" />
        <div className="w-1 h-1 bg-[var(--text-accent)]/20" />
        <div className="w-1 h-1 bg-[var(--text-accent)]/20" />
        <div className="w-8 h-px bg-gradient-to-r from-[var(--text-accent)]/30 to-transparent" />
      </div>
    </div>
  );
}
