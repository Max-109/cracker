'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  BookOpen,
  Lightbulb,
  Brain,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  Minus,
  FileText,
  Layers
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

const REMARK_PLUGINS = [remarkMath, remarkGfm];
const REHYPE_PLUGINS = [rehypeKatex];

// Learning sub-mode type
type LearningSubMode = 'summary' | 'flashcard' | 'teaching';

interface LearningModeIndicatorProps {
  isStreaming?: boolean;
  compact?: boolean;
  thinkContent?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  markdownComponents?: any;
  learningSubMode?: LearningSubMode;
}

// Mode-specific configurations
const MODE_CONFIGS = {
  summary: {
    icon: FileText,
    streamingLabels: ["Extracting", "Analyzing", "Structuring", "Synthesizing"],
    completeLabel: "Summary Mode",
    streamingDesc: "Extracting key concepts from document...",
    completeDesc: "Comprehensive concept summary"
  },
  flashcard: {
    icon: Layers,
    streamingLabels: ["Creating", "Generating", "Formulating", "Building"],
    completeLabel: "Flashcard Mode",
    streamingDesc: "Generating flashcards from document...",
    completeDesc: "Q&A flashcard set for review"
  },
  teaching: {
    icon: GraduationCap,
    streamingLabels: ["Teaching", "Explaining", "Illustrating", "Demonstrating", "Guiding"],
    completeLabel: "Teaching Mode",
    streamingDesc: "Preparing structured explanation...",
    completeDesc: "Optimized for learning & understanding"
  }
};

export function LearningModeIndicator({
  isStreaming,
  compact,
  thinkContent,
  isOpen = false,
  onToggle,
  markdownComponents,
  learningSubMode = 'teaching'
}: LearningModeIndicatorProps) {
  // Get mode config
  const modeConfig = MODE_CONFIGS[learningSubMode];
  const IconComponent = modeConfig.icon;
  const [randomLabel] = useState(() => modeConfig.streamingLabels[Math.floor(Math.random() * modeConfig.streamingLabels.length)]);

  // Determine if this should be expandable (has thinking content)
  const isExpandable = !!thinkContent && thinkContent.trim().length > 0 && thinkContent.trim() !== '[REDACTED]';
  const displayLabel = isStreaming ? randomLabel : modeConfig.completeLabel;
  const displayDesc = isStreaming ? modeConfig.streamingDesc : modeConfig.completeDesc;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--text-accent)]/10 border border-[var(--text-accent)]/30">
        <IconComponent size={12} className={cn("text-[var(--text-accent)]", isStreaming && "animate-pulse")} />
        <span className="text-[9px] uppercase tracking-[0.12em] font-semibold text-[var(--text-accent)]">
          {modeConfig.completeLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="border border-[var(--text-accent)]/30 bg-[#141414] p-3">
      <button
        onClick={isExpandable ? onToggle : undefined}
        disabled={!isExpandable}
        className={cn(
          "flex items-center gap-3 w-full text-left",
          isExpandable && "cursor-pointer hover:opacity-80 transition-opacity"
        )}
      >
        <div className="relative">
          <div className="w-8 h-8 flex items-center justify-center border border-[var(--text-accent)]/50 bg-[var(--text-accent)]/10">
            <IconComponent size={16} className={cn("text-[var(--text-accent)]", isStreaming && "animate-pulse")} />
          </div>
          {isStreaming && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--text-accent)] animate-pulse" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--text-accent)]",
              isStreaming && "animate-pulse"
            )}>
              {displayLabel}
            </span>
            <div className="flex items-center gap-1">
              <Lightbulb size={10} className="text-[var(--text-accent)]/60" />
              <BookOpen size={10} className="text-[var(--text-accent)]/60" />
              <Brain size={10} className="text-[var(--text-accent)]/60" />
            </div>
          </div>
          <div className="text-[9px] text-[var(--text-secondary)] mt-0.5">
            {displayDesc}
          </div>
        </div>

        {isExpandable && !isStreaming && (
          <div className="flex items-center justify-center text-[var(--text-secondary)] flex-shrink-0">
            {isOpen ? <Minus size={14} /> : <Plus size={14} />}
          </div>
        )}

        {isStreaming && (
          <div className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1 h-1 bg-[var(--text-accent)] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </button>

      {/* Expandable thinking content */}
      {isExpandable && isOpen && thinkContent && (
        <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
          <div className="text-[var(--text-secondary)] text-sm whitespace-pre-wrap overflow-hidden">
            <div className="prose dark:prose-invert max-w-none text-sm text-[var(--text-secondary)]" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              <ReactMarkdown
                remarkPlugins={REMARK_PLUGINS}
                rehypePlugins={REHYPE_PLUGINS}
                components={markdownComponents}
              >
                {thinkContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Badge for completed learning responses (more compact)
export function LearningModeBadge() {
  return (
    <div className="border border-[var(--text-accent)]/20 bg-[var(--text-accent)]/5 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center border border-[var(--text-accent)]/40 bg-[var(--text-accent)]/10">
            <GraduationCap size={12} className="text-[var(--text-accent)]" />
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-[0.12em] font-semibold text-[var(--text-accent)]">
              Learning Mode
            </span>
            <div className="text-[8px] text-[var(--text-secondary)]">
              Detailed explanation
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-2 bg-[var(--text-accent)]/40" />
          <div className="w-1 h-3 bg-[var(--text-accent)]/60" />
          <div className="w-1 h-4 bg-[var(--text-accent)]" />
        </div>
      </div>
    </div>
  );
}
