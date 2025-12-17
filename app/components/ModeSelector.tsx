'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MessageCircle, Image, GraduationCap, Microscope } from 'lucide-react';

export type ChatMode = 'chat' | 'image' | 'learning' | 'deep-search';

interface ModeSelectorProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

const MODE_OPTIONS = [
  { mode: 'chat' as const, icon: MessageCircle, label: 'Chat', desc: 'Conversation' },
  { mode: 'image' as const, icon: Image, label: 'Image', desc: 'Generate images' },
  { mode: 'learning' as const, icon: GraduationCap, label: 'Learn', desc: 'Learning mode' },
  // { mode: 'deep-search' as const, icon: Microscope, label: 'Research', desc: 'Deep research' }, // Hidden for now
];

export function ModeSelector({ currentMode, onModeChange, disabled }: ModeSelectorProps) {
  const currentIndex = MODE_OPTIONS.findIndex(o => o.mode === currentMode);
  const currentOption = MODE_OPTIONS[currentIndex];
  const CurrentIcon = currentOption.icon;
  const isSpecialMode = currentMode !== 'chat';

  const cycleMode = () => {
    const nextIndex = (currentIndex + 1) % MODE_OPTIONS.length;
    onModeChange(MODE_OPTIONS[nextIndex].mode);
  };

  return (
    <button
      onClick={cycleMode}
      disabled={disabled}
      className={cn(
        "w-10 h-10 border bg-[#1a1a1a] flex items-center justify-center relative group transition-all duration-200",
        isSpecialMode
          ? "border-[var(--text-accent)]/50 text-[var(--text-accent)]"
          : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      title={`Mode: ${currentOption.label} (click to change)`}
    >
      {/* Icon */}
      <CurrentIcon
        size={16}
        strokeWidth={2}
        className="transition-transform duration-200 group-hover:scale-110"
      />

      {/* Mode position indicator - 3 dots */}
      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
        {MODE_OPTIONS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1 h-1 transition-all duration-200",
              i === currentIndex
                ? "bg-[var(--text-accent)]"
                : "bg-[var(--border-color)]"
            )}
          />
        ))}
      </div>

      {/* Glow effect for special modes */}
      {isSpecialMode && (
        <div className="absolute inset-0 bg-[var(--text-accent)]/5 pointer-events-none" />
      )}
    </button>
  );
}
