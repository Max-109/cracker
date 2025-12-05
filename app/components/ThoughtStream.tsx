'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ResearchProgress, ResearchPhase } from './DeepResearchProgress';
import { Brain, Sparkles, Search, Microscope, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

const PHASE_ORDER: ResearchPhase[] = ['planning', 'searching', 'analyzing', 'deep-dive', 'writing', 'complete'];

const PHASE_ICONS: Record<ResearchPhase, React.ElementType> = {
    planning: Sparkles,
    searching: Search,
    analyzing: Brain,
    'deep-dive': Microscope,
    writing: FileText,
    complete: CheckCircle2,
    clarify: Brain, // Should be handled separately but just in case
};

export function ThoughtStream({ progress }: { progress: ResearchProgress }) {
    const currentPhaseIndex = PHASE_ORDER.indexOf(progress.phase as ResearchPhase);

    // Auto-scroll logic could go here

    // Custom "Circuit Track" visualization
    return (
        <div className="relative pl-4 py-2 font-mono text-sm">
            {/* Main Vertical Track Line */}
            <div className="absolute left-[27px] top-6 bottom-6 w-[2px] bg-[#2a2a2a] overflow-hidden">
                {/* Active "Runner" on the track */}
                <div
                    className="absolute top-0 w-full bg-[var(--text-accent)] shadow-[0_0_10px_var(--text-accent)] transition-all duration-500 ease-out"
                    style={{
                        height: `${(Math.max(0, currentPhaseIndex) / (PHASE_ORDER.length - 1)) * 100}%`
                    }}
                />
            </div>

            <div className="space-y-6 relative z-10">
                {PHASE_ORDER.filter(p => p !== 'complete').map((phase, idx) => {
                    const isCompleted = currentPhaseIndex > idx;
                    const isActive = currentPhaseIndex === idx;
                    const isPending = currentPhaseIndex < idx;
                    const Icon = PHASE_ICONS[phase];

                    return (
                        <div
                            key={phase}
                            className={cn(
                                "flex items-start gap-4 transition-all duration-500",
                                isActive ? "opacity-100 scale-100" : isPending ? "opacity-30 blur-[0.5px] scale-95" : "opacity-60"
                            )}
                        >
                            {/* Node Icon */}
                            <div className={cn(
                                "relative w-6 h-6 flex items-center justify-center rounded-sm border transition-colors duration-300 z-10 bg-[#141414]",
                                isActive ? "border-[var(--text-accent)] text-[var(--text-accent)] shadow-[0_0_15px_-3px_var(--text-accent)]" :
                                    isCompleted ? "border-[var(--text-accent)]/50 text-[var(--text-accent)]/50" :
                                        "border-[#333] text-[#555]"
                            )}>
                                <Icon size={12} />

                                {/* Active Pulse Ring */}
                                {isActive && (
                                    <div className="absolute inset-0 border border-[var(--text-accent)] rounded-sm animate-ping opacity-20" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="pt-0.5 flex-1 min-w-0">
                                <div className={cn(
                                    "text-xs uppercase tracking-[0.15em] font-bold mb-1",
                                    isActive ? "text-[var(--text-accent)]" : isCompleted ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                                )}>
                                    {phase.replace('-', ' ')}
                                </div>

                                {isActive && (
                                    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                        <div className="text-[11px] text-[var(--text-primary)] leading-relaxed">
                                            {progress.phaseDescription}
                                        </div>

                                        {/* Dynamic details for active phase */}
                                        {progress.searches.length > 0 && phase === 'searching' && (
                                            <div className="mt-2 text-[10px] text-[var(--text-secondary)] font-mono border-l-2 border-[#333] pl-2 space-y-1">
                                                {progress.searches.slice(-2).map((s, i) => (
                                                    <div key={i} className="flex items-center gap-2 truncate">
                                                        <Loader2 size={8} className="animate-spin text-[var(--text-accent)]" />
                                                        <span className="opacity-70">"{s.query}"</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Completion Node */}
            {progress.isComplete && (
                <div className="mt-6 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="w-6 h-6 flex items-center justify-center rounded-sm border border-[var(--text-accent)] bg-[var(--text-accent)]/10 text-[var(--text-accent)] z-10 shadow-[0_0_20px_-5px_var(--text-accent)]">
                        <CheckCircle2 size={14} />
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--text-accent)]">
                            Reasoning Complete
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                            Synthesizing final response...
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
