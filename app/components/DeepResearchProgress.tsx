'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Microscope,
  Search,
  Globe,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Brain,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export type ResearchPhase = 'clarify' | 'planning' | 'searching' | 'analyzing' | 'deep-dive' | 'writing' | 'complete';

export interface ResearchProgress {
  phase: ResearchPhase;
  phaseDescription: string;
  percent: number;
  message: string;
  searches: { query: string; index: number; total: number }[];
  sources: { url: string; title: string }[];
  isComplete: boolean;
  elapsed?: number;
}

export interface ClarifyQuestion {
  question: string;
  answer: string;
}

interface DeepResearchProgressProps {
  progress: ResearchProgress;
  clarifyQuestions?: string[];
  onClarifySubmit?: (answers: { q: string; a: string }[]) => void;
  onSkipClarify?: () => void;
}

const PHASE_CONFIG: Record<ResearchPhase | 'error', { icon: typeof Microscope; label: string; color: string }> = {
  clarify: { icon: Brain, label: 'Understanding', color: 'text-purple-400' },
  planning: { icon: Sparkles, label: 'Planning', color: 'text-blue-400' },
  searching: { icon: Search, label: 'Searching', color: 'text-yellow-400' },
  analyzing: { icon: Brain, label: 'Analyzing', color: 'text-orange-400' },
  'deep-dive': { icon: Microscope, label: 'Deep Dive', color: 'text-pink-400' },
  writing: { icon: FileText, label: 'Writing', color: 'text-green-400' },
  complete: { icon: CheckCircle2, label: 'Complete', color: 'text-[var(--text-accent)]' },
  error: { icon: AlertTriangle, label: 'Error', color: 'text-red-400' },
};

export function DeepResearchProgress({ 
  progress, 
  clarifyQuestions,
  onClarifySubmit,
  onSkipClarify 
}: DeepResearchProgressProps) {
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);
  const [isSearchesExpanded, setIsSearchesExpanded] = useState(false);
  const [clarifyAnswers, setClarifyAnswers] = useState<string[]>([]);
  
  const phaseConfig = PHASE_CONFIG[progress.phase as ResearchPhase] || PHASE_CONFIG.searching;
  const PhaseIcon = phaseConfig.icon;

  // Handle error state
  const isErrorState = (progress as any).isError;
  
  // Handle clarifying questions mode
  if (clarifyQuestions && clarifyQuestions.length > 0 && !progress.isComplete) {
    return (
      <div className="border border-[var(--text-accent)]/30 bg-[#141414] p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain size={20} className="text-[var(--text-accent)]" />
            <div className="absolute inset-0 animate-pulse opacity-30">
              <Brain size={20} className="text-[var(--text-accent)]" />
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.12em] font-semibold text-[var(--text-accent)]">
              Before We Start
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              A few questions to ensure the best research results
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {clarifyQuestions.map((question, idx) => (
            <div key={idx} className="space-y-2">
              <label className="block text-sm text-[var(--text-primary)]">
                <span className="text-[var(--text-accent)] mr-2">{idx + 1}.</span>
                {question}
              </label>
              <textarea
                value={clarifyAnswers[idx] || ''}
                onChange={(e) => {
                  const newAnswers = [...clarifyAnswers];
                  newAnswers[idx] = e.target.value;
                  setClarifyAnswers(newAnswers);
                }}
                placeholder="Your answer..."
                className="w-full bg-[#1a1a1a] border border-[var(--border-color)] text-[var(--text-primary)] text-sm px-3 py-2 resize-none focus:outline-none focus:border-[var(--text-accent)]/50 min-h-[60px]"
              />
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
          <button
            onClick={onSkipClarify}
            className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors"
          >
            Skip & Research Now
          </button>
          <button
            onClick={() => {
              const answers = clarifyQuestions.map((q, idx) => ({
                q,
                a: clarifyAnswers[idx] || ''
              })).filter(a => a.a.trim());
              onClarifySubmit?.(answers);
            }}
            disabled={clarifyAnswers.filter(a => a?.trim()).length === 0}
            className={cn(
              "px-4 py-2 text-xs uppercase tracking-[0.12em] font-semibold border transition-all",
              clarifyAnswers.filter(a => a?.trim()).length > 0
                ? "bg-[var(--text-accent)] text-black border-[var(--text-accent)] hover:bg-[#1a1a1a] hover:text-[var(--text-accent)]"
                : "bg-[#1a1a1a] text-[var(--text-secondary)] border-[var(--border-color)] cursor-not-allowed opacity-50"
            )}
          >
            Start Research
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="border border-[var(--text-accent)]/30 bg-[#141414] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <PhaseIcon size={20} className={cn(phaseConfig.color, !progress.isComplete && "animate-pulse")} />
            {!progress.isComplete && (
              <div className="absolute inset-0 animate-ping opacity-20">
                <PhaseIcon size={20} className={phaseConfig.color} />
              </div>
            )}
          </div>
          <div>
            <div className={cn("text-xs uppercase tracking-[0.12em] font-semibold", phaseConfig.color)}>
              {isErrorState ? 'Research Error' : progress.isComplete ? 'Research Complete' : phaseConfig.label}
            </div>
            <div className={cn("text-[10px] mt-0.5", isErrorState ? "text-red-400" : "text-[var(--text-secondary)]")}>
              {isErrorState ? progress.message || 'An error occurred during research' : progress.phaseDescription || progress.message}
            </div>
          </div>
        </div>

        {progress.elapsed && progress.isComplete && (
          <div className="text-[10px] text-[var(--text-secondary)]">
            {progress.elapsed.toFixed(1)}s
          </div>
        )}
      </div>

      {/* Progress Bar with loading animation */}
      <div className="space-y-1">
        <div className="h-1.5 bg-[#2a2a2a] overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 ease-out",
              progress.isComplete ? "bg-[var(--text-accent)]" : "bg-gradient-to-r from-[var(--text-accent)] to-[var(--text-accent)]/50",
              !progress.isComplete && "animate-progress-pulse"
            )}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">
          <span>{progress.message || 'Loading...'}</span>
          <span>{progress.percent}%</span>
        </div>
      </div>
      
      {/* Live Searches */}
      {progress.searches.length > 0 && !progress.isComplete && (
        <div className="space-y-2">
          <button
            onClick={() => setIsSearchesExpanded(!isSearchesExpanded)}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors w-full"
          >
            <Search size={12} className="text-[var(--text-accent)]" />
            <span>Searches ({progress.searches.length})</span>
            {isSearchesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          
          {isSearchesExpanded && (
            <div className="max-h-[120px] overflow-y-auto space-y-1 pl-5">
              {progress.searches.slice(-10).map((search, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] animate-in slide-in-from-left-2 duration-200"
                >
                  {idx === progress.searches.length - 1 ? (
                    <Loader2 size={10} className="text-[var(--text-accent)] animate-spin" />
                  ) : (
                    <CheckCircle2 size={10} className="text-green-500/70" />
                  )}
                  <span className="truncate">{search.query}</span>
                </div>
              ))}
            </div>
          )}
          
          {!isSearchesExpanded && progress.searches.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] pl-5">
              <Loader2 size={10} className="text-[var(--text-accent)] animate-spin" />
              <span className="truncate">{progress.searches[progress.searches.length - 1]?.query}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Sources Found */}
      {progress.sources.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setIsSourcesExpanded(!isSourcesExpanded)}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors w-full"
          >
            <Globe size={12} className="text-[var(--text-accent)]" />
            <span>Sources Found ({progress.sources.length})</span>
            {isSourcesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          
          {isSourcesExpanded && (
            <div className="max-h-[200px] overflow-y-auto space-y-1 pl-5">
              {progress.sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors group"
                >
                  <span className="text-[var(--text-accent)] font-mono">[{idx + 1}]</span>
                  <span className="truncate flex-1">{source.title}</span>
                  <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 flex-shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Phase indicators */}
      {!progress.isComplete && (
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
          {(['planning', 'searching', 'analyzing', 'deep-dive', 'writing'] as ResearchPhase[]).map((phase, idx) => {
            const config = PHASE_CONFIG[phase];
            const isActive = progress.phase === phase;
            const isPast = ['planning', 'searching', 'analyzing', 'deep-dive', 'writing'].indexOf(progress.phase) > idx;
            
            return (
              <div 
                key={phase}
                className={cn(
                  "flex-1 h-1",
                  isPast ? "bg-[var(--text-accent)]" :
                  isActive ? "bg-[var(--text-accent)]/50 animate-pulse" :
                  "bg-[#2a2a2a]"
                )}
                title={config.label}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Compact source display for completed research
interface SourcesDisplayProps {
  sources: { url: string; title: string }[];
  maxVisible?: number;
}

export function SourcesDisplay({ sources, maxVisible = 5 }: SourcesDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (sources.length === 0) return null;
  
  const visibleSources = isExpanded ? sources : sources.slice(0, maxVisible);
  const hiddenCount = sources.length - maxVisible;
  
  return (
    <div className="border border-[var(--border-color)] bg-[#141414] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Globe size={12} className="text-[var(--text-accent)]" />
        <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--text-secondary)]">
          Sources ({sources.length})
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {visibleSources.map((source, idx) => (
          <a
            key={idx}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2 py-1.5 bg-[#1a1a1a] border border-[var(--border-color)] hover:border-[var(--text-accent)]/50 transition-colors group"
          >
            <span className="text-[9px] text-[var(--text-accent)] font-mono">[{idx + 1}]</span>
            <span className="text-[10px] text-[var(--text-primary)] truncate flex-1">{source.title}</span>
            <ExternalLink size={10} className="text-[var(--text-secondary)] group-hover:text-[var(--text-accent)] flex-shrink-0" />
          </a>
        ))}
      </div>
      
      {hiddenCount > 0 && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="text-[10px] text-[var(--text-accent)] hover:underline"
        >
          +{hiddenCount} more sources
        </button>
      )}
      
      {isExpanded && sources.length > maxVisible && (
        <button
          onClick={() => setIsExpanded(false)}
          className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-accent)]"
        >
          Show less
        </button>
      )}
    </div>
  );
}
