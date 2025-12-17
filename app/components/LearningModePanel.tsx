'use client';

import React, { useRef } from 'react';
import { BookOpen, Layers, GraduationCap, Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LearningSubMode } from '@/app/hooks/usePersistedSettings';
import type { AttachmentItem } from '@/app/hooks/useAttachments';

interface LearningModePanelProps {
    selectedMode: LearningSubMode;
    onModeChange: (mode: LearningSubMode) => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    attachments: AttachmentItem[];
    disabled?: boolean;
}

const SUB_MODES = [
    {
        mode: 'summary' as const,
        icon: BookOpen,
        label: 'Summary',
        desc: 'Extract key concepts from PDF',
        needsPdf: true,
    },
    {
        mode: 'flashcard' as const,
        icon: Layers,
        label: 'Flashcards',
        desc: 'Generate study Q&A cards',
        needsPdf: true,
    },
    {
        mode: 'teaching' as const,
        icon: GraduationCap,
        label: 'Teaching',
        desc: 'Interactive learning assistant',
        needsPdf: false,
    },
];

export function LearningModePanel({
    selectedMode,
    onModeChange,
    onFileSelect,
    attachments,
    disabled,
}: LearningModePanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentModeConfig = SUB_MODES.find(m => m.mode === selectedMode);
    const hasPdfAttachment = attachments.some(a => a.mediaType === 'application/pdf');

    return (
        <div className="border border-[var(--border-color)] bg-[#141414] p-4 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <GraduationCap size={14} className="text-[var(--text-accent)]" />
                <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--text-secondary)]">
                    Learning Mode
                </span>
            </div>

            {/* Sub-mode Cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                {SUB_MODES.map(({ mode, icon: Icon, label, desc }) => {
                    const isSelected = selectedMode === mode;
                    return (
                        <button
                            key={mode}
                            onClick={() => onModeChange(mode)}
                            disabled={disabled}
                            className={cn(
                                "flex flex-col items-center p-3 border transition-all duration-150 group text-center",
                                isSelected
                                    ? "bg-[var(--text-accent)]/10 border-[var(--text-accent)] text-[var(--text-accent)]"
                                    : "bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-primary)]",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {/* Icon */}
                            <div className={cn(
                                "w-10 h-10 flex items-center justify-center border mb-2 transition-all duration-150",
                                isSelected
                                    ? "bg-[var(--text-accent)] border-[var(--text-accent)] text-black"
                                    : "bg-[#0f0f0f] border-[var(--border-color)] group-hover:border-[var(--text-accent)]/50"
                            )}>
                                <Icon size={18} />
                            </div>

                            {/* Label */}
                            <span className={cn(
                                "text-xs font-semibold uppercase tracking-[0.08em] mb-1",
                                isSelected && "text-[var(--text-accent)]"
                            )}>
                                {label}
                            </span>

                            {/* Description */}
                            <span className="text-[9px] text-[var(--text-secondary)] leading-tight">
                                {desc}
                            </span>

                            {/* Selection indicator */}
                            {isSelected && (
                                <div className="w-1.5 h-1.5 bg-[var(--text-accent)] rounded-full mt-2 animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* PDF Upload Section - Only show for summary and flashcard modes */}
            {currentModeConfig?.needsPdf && (
                <div className="border-t border-[var(--border-color)] pt-4">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={onFileSelect}
                        accept="application/pdf"
                        className="hidden"
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled}
                        className={cn(
                            "w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed transition-all duration-150",
                            hasPdfAttachment
                                ? "border-[var(--text-accent)] bg-[var(--text-accent)]/5"
                                : "border-[var(--border-color)] hover:border-[var(--text-accent)]/50 hover:bg-[#1a1a1a]",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {hasPdfAttachment ? (
                            <>
                                <FileText size={20} className="text-[var(--text-accent)]" />
                                <span className="text-sm text-[var(--text-accent)] font-medium">
                                    PDF attached - ready to process
                                </span>
                            </>
                        ) : (
                            <>
                                <Upload size={20} className="text-[var(--text-secondary)]" />
                                <div className="flex flex-col items-start">
                                    <span className="text-sm text-[var(--text-primary)] font-medium">
                                        Upload PDF
                                    </span>
                                    <span className="text-[10px] text-[var(--text-secondary)]">
                                        Click to select a file for {selectedMode === 'summary' ? 'concept extraction' : 'flashcard generation'}
                                    </span>
                                </div>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Teaching mode hint */}
            {selectedMode === 'teaching' && (
                <div className="text-[10px] text-[var(--text-secondary)] text-center py-2">
                    Ask questions and I&apos;ll help you learn step by step
                </div>
            )}
        </div>
    );
}
