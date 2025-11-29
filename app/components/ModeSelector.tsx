'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { MessageCircle, GraduationCap, Microscope, Layers } from 'lucide-react';

export type ChatMode = 'chat' | 'learning' | 'deep-search';

interface ModeSelectorProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

const MODE_OPTIONS = [
  { 
    mode: 'chat' as const, 
    icon: MessageCircle, 
    label: 'Chat',
    desc: 'Standard conversation',
    level: 1,
  },
  { 
    mode: 'learning' as const, 
    icon: GraduationCap, 
    label: 'Learning',
    desc: 'Step-by-step explanations',
    level: 2,
  },
  { 
    mode: 'deep-search' as const, 
    icon: Microscope, 
    label: 'Deep Research',
    desc: 'Web research with sources',
    level: 3,
  },
];

export function ModeSelector({ currentMode, onModeChange, disabled }: ModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = MODE_OPTIONS.find(opt => opt.mode === currentMode) || MODE_OPTIONS[0];
  const CurrentIcon = currentOption.icon;
  
  // Only accent when NOT in default chat mode
  const isSpecialMode = currentMode !== 'chat';

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-10 h-10 border bg-[#1a1a1a] flex items-center justify-center group transition-all duration-150",
          isOpen
            ? "border-[var(--text-accent)] text-[var(--text-accent)]"
            : isSpecialMode
              ? "border-[var(--text-accent)]/50 text-[var(--text-accent)]"
              : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        title={`Mode: ${currentOption.label}`}
      >
        <CurrentIcon size={16} strokeWidth={2} className="group-hover:scale-110 transition-transform duration-200" />
        {/* Active mode indicator dot */}
        {isSpecialMode && !isOpen && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--text-accent)] animate-pulse" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 w-[240px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] overflow-hidden z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-150 origin-bottom-left">
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-[var(--border-color)] bg-[#0f0f0f]">
              <div className="flex items-center gap-2">
                <Layers size={12} className="text-[var(--text-accent)]" />
                <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">Chat Mode</span>
              </div>
            </div>

            <div className="p-1.5">
              {MODE_OPTIONS.map(({ mode, icon: Icon, label, desc, level }) => {
                const isSelected = currentMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      onModeChange(mode);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm transition-all duration-150 group relative",
                      isSelected
                        ? "bg-[var(--text-accent)]/10 border-l-2 border-l-[var(--text-accent)]"
                        : "hover:bg-[#1e1e1e] border-l-2 border-l-transparent"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "w-7 h-7 flex items-center justify-center border transition-all duration-150",
                      isSelected
                        ? "bg-[var(--text-accent)] border-[var(--text-accent)] text-black"
                        : "bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-secondary)] group-hover:border-[var(--text-accent)]/50 group-hover:text-[var(--text-accent)]"
                    )}>
                      <Icon size={14} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "font-semibold uppercase tracking-[0.1em] text-xs",
                        isSelected ? "text-[var(--text-accent)]" : "text-[var(--text-primary)]"
                      )}>
                        {label}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{desc}</div>
                    </div>

                    {/* Level Indicator Bars */}
                    <div className="flex items-end gap-0.5 h-4">
                      {[1, 2, 3].map((bar) => (
                        <div
                          key={bar}
                          className={cn(
                            "w-1 transition-all duration-150",
                            bar === 1 ? "h-1.5" : bar === 2 ? "h-2.5" : "h-4",
                            bar <= level
                              ? isSelected
                                ? "bg-[var(--text-accent)]"
                                : "bg-[var(--text-secondary)] group-hover:bg-[var(--text-accent)]/70"
                              : "bg-[#2a2a2a]"
                          )}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[#0f0f0f]">
              <p className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">
                Deep Research searches the web
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
