'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowUp, Paperclip, Square, Sparkles, X, File as FileIcon, Zap, Brain, Flame, Mic, AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttachmentItem } from '@/app/hooks/useAttachments';
import type { ReasoningEffortLevel, LearningSubMode } from '@/app/hooks/usePersistedSettings';
import { useVoiceRecording } from '@/app/hooks/useVoiceRecording';
import { ModeSelector, ChatMode } from './ModeSelector';
import { LearningModePanel } from './LearningModePanel';
import { ImageLightbox, useLightbox } from './ImageLightbox';
import {
  Textarea,
  CircularProgress,
  Spinner,
} from '@/components/ui';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isLoading: boolean;
  attachments: AttachmentItem[];
  hasPendingAttachments: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onRemoveAttachment: (id: string) => void;
  reasoningEffort: ReasoningEffortLevel;
  onReasoningEffortChange: (effort: ReasoningEffortLevel) => void;
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  learningSubMode: LearningSubMode;
  onLearningSubModeChange: (mode: LearningSubMode) => void;
  disabled?: boolean;
  chatId?: string | null;
}

export function ChatInput({
  input,
  onInputChange,
  onSend,
  onStop,
  isLoading,
  attachments,
  hasPendingAttachments,
  onFileSelect,
  onPaste,
  onRemoveAttachment,
  reasoningEffort,
  onReasoningEffortChange,
  chatMode,
  onChatModeChange,
  learningSubMode,
  onLearningSubModeChange,
  disabled,
  chatId,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEffortMenuOpen, setIsEffortMenuOpen] = useState(false);
  const [voiceModel, setVoiceModel] = useState<'fast' | 'expert'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('voiceModel');
      if (saved === 'fast' || saved === 'expert') return saved;
    }
    return 'fast';
  });
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [, setVoiceError] = useState<string | null>(null);

  // Image lightbox
  const { isOpen: isLightboxOpen, src: lightboxSrc, alt: lightboxAlt, openLightbox, closeLightbox } = useLightbox();

  // Persist voice model to localStorage
  useEffect(() => {
    localStorage.setItem('voiceModel', voiceModel);
  }, [voiceModel]);

  // Voice recording
  const handleTranscription = useCallback((text: string) => {
    onInputChange(input ? `${input} ${text}` : text);
    textareaRef.current?.focus();
  }, [input, onInputChange]);

  const handleVoiceError = useCallback((error: string) => {
    setVoiceError(error);
    setTimeout(() => setVoiceError(null), 3000);
  }, []);

  const {
    permissionDenied,
    startRecording,
    stopRecording,
    isRecording,
    isTranscribing,
    estimatedDuration,
    transcribeStartTime,
  } = useVoiceRecording({
    onTranscription: handleTranscription,
    onError: handleVoiceError,
  });

  // Track transcription progress
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const progressRef = useRef(0); // Store current progress in ref to survive state changes
  const animationFrameRef = useRef<number | null>(null);
  const wasTranscribingRef = useRef(false);

  // Sync progress to ref
  useEffect(() => {
    progressRef.current = transcribeProgress;
  }, [transcribeProgress]);

  // Handle transcription state changes - detect start and completion
  useEffect(() => {
    const wasTranscribing = wasTranscribingRef.current;
    wasTranscribingRef.current = isTranscribing;

    if (isTranscribing && !wasTranscribing) {
      // Just started transcribing - use requestAnimationFrame to avoid synchronous setState
      requestAnimationFrame(() => {
        setShowProgress(true);
        setTranscribeProgress(0);
        progressRef.current = 0;
      });
    } else if (!isTranscribing && wasTranscribing) {
      // Just finished transcribing - animate to 100%
      const startProgress = progressRef.current;

      // Only animate if we have some progress
      if (startProgress > 0) {
        const startTime = Date.now();
        const animationDuration = 300;

        const animateToComplete = () => {
          const elapsed = Date.now() - startTime;
          const t = Math.min(elapsed / animationDuration, 1);
          // Ease out cubic for smooth deceleration
          const eased = 1 - Math.pow(1 - t, 3);
          const newProgress = startProgress + (1 - startProgress) * eased;

          setTranscribeProgress(newProgress);
          progressRef.current = newProgress;

          if (t < 1) {
            animationFrameRef.current = requestAnimationFrame(animateToComplete);
          } else {
            // Animation complete, wait a moment at 100% then hide
            setTimeout(() => {
              setShowProgress(false);
              setTranscribeProgress(0);
              progressRef.current = 0;
            }, 200);
          }
        };

        animationFrameRef.current = requestAnimationFrame(animateToComplete);
      } else {
        // No progress yet, just hide immediately
        requestAnimationFrame(() => setShowProgress(false));
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isTranscribing]);

  // Update progress during transcription
  useEffect(() => {
    if (!isTranscribing || !transcribeStartTime || !estimatedDuration) {
      return;
    }

    const updateProgress = () => {
      const elapsed = Date.now() - transcribeStartTime;
      const ratio = elapsed / estimatedDuration;

      // Adaptive estimation: slow down more aggressively as we exceed estimate
      let progress: number;
      if (ratio <= 1) {
        // Before estimated time: ease-out quad, cap at 85%
        const easedProgress = 1 - Math.pow(1 - ratio, 2);
        progress = easedProgress * 0.85;
      } else {
        // After estimated time: logarithmic slowdown from 85% to 95%
        // Progress slows down significantly, asymptotically approaching 95%
        const overTime = ratio - 1;
        const additionalProgress = 0.10 * (1 - Math.exp(-overTime * 0.5));
        progress = 0.85 + additionalProgress;
      }

      const finalProgress = Math.min(progress, 0.95);
      setTranscribeProgress(finalProgress);
      progressRef.current = finalProgress;
    };

    updateProgress();
    const interval = setInterval(updateProgress, 50);
    return () => clearInterval(interval);
  }, [isTranscribing, transcribeStartTime, estimatedDuration]);

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(voiceModel);
    }
  }, [isRecording, startRecording, stopRecording, voiceModel]);

  const handleMicContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!isRecording && !isLoading && !showProgress) {
      setIsVoiceMenuOpen(true);
    }
  }, [isRecording, isLoading, showProgress]);

  // Auto-focus textarea when chat changes or on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [chatId]);

  // Handle mobile keyboard
  const handleFocus = () => {
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      if (document.activeElement === textareaRef.current) {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const canSend = (input.trim() || attachments.length > 0) && !hasPendingAttachments;

  return (
    <div className="flex-shrink-0 w-full bg-[var(--bg-main)] border-t border-[var(--border-color)] pt-6 pb-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] relative z-40 dropdown-container">
      <div className="max-w-[900px] mx-auto px-4 space-y-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          className="hidden"
          multiple
        />

        {/* Learning Mode Panel - Show when in learning mode and NOT streaming */}
        {chatMode === 'learning' && !isLoading && (
          <LearningModePanel
            selectedMode={learningSubMode}
            onModeChange={onLearningSubModeChange}
            onFileSelect={onFileSelect}
            attachments={attachments}
            disabled={isLoading}
          />
        )}

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="border border-[var(--border-color)] bg-[#1a1a1a] p-3 mb-2 flex flex-col w-full">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <Paperclip size={12} className="text-[var(--text-accent)]" />
              <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--text-primary)]">
                Attachments
              </span>
              <span className="text-[9px] text-[var(--text-accent)] opacity-70">({attachments.length})</span>
            </div>

            {/* Attachment Grid */}
            <div className="flex flex-wrap gap-2 w-full">
              {attachments.map((attachment) => (
                <AttachmentCard
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={() => onRemoveAttachment(attachment.id)}
                  onImageClick={openLightbox}
                />
              ))}
            </div>

            {/* Pending Status */}
            {hasPendingAttachments && (
              <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center gap-2 flex-shrink-0">
                <Spinner size="xs" variant="accent" />
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-accent)]">
                  Preparing {attachments.filter(a => a.isUploading).length} file(s)...
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Paperclip Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 border border-[var(--border-color)] bg-[#1a1a1a] text-[var(--text-secondary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)] flex items-center justify-center mb-[2px] group transition-all duration-150"
          >
            <Paperclip size={16} strokeWidth={2} className="group-hover:rotate-12 transition-transform duration-200" />
          </button>

          {/* Mode Selector - Left side near attachments */}
          <div className="mb-[2px]">
            <ModeSelector
              currentMode={chatMode}
              onModeChange={onChatModeChange}
              disabled={isLoading}
            />
          </div>

          <div className="flex-1">
            <div className="border border-[var(--border-color)] bg-[#1a1a1a] flex items-end p-2.5 gap-2 hover:border-[var(--text-accent)]/30 focus-within:border-[var(--text-accent)]/50 transition-all duration-150">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={onPaste}
                onFocus={() => {
                  handleFocus();
                  document.body.classList.add('focus-mode');
                }}
                onBlur={() => document.body.classList.remove('focus-mode')}
                placeholder="Let's crack..."
                autoResize
                maxHeight={200}
                rows={1}
                disabled={disabled}
                className="pb-1 no-outline bg-transparent"
                autoFocus
              />

              {/* Mic Button - Inside Prompt Box */}
              <div className="relative">
                <button
                  onClick={handleMicClick}
                  onContextMenu={handleMicContextMenu}
                  disabled={isLoading || showProgress}
                  className={cn(
                    "flex-shrink-0 w-8 h-8 flex items-center justify-center transition-all duration-150 relative mb-0.5",
                    isRecording
                      ? "text-[var(--text-accent)]"
                      : showProgress
                        ? "text-[var(--text-accent)]"
                        : "text-[var(--text-accent)] hover:scale-110",
                    (isLoading || showProgress) && !isRecording && "cursor-not-allowed"
                  )}
                  title={isRecording ? "Stop recording" : showProgress ? "Transcribing..." : permissionDenied ? "Microphone access denied" : `Voice input (${voiceModel === 'expert' ? 'Accurate' : 'Fast'}) - Right click for options`}
                >
                  {showProgress ? (
                    /* Circular Progress Indicator */
                    <div className="relative w-7 h-7">
                      {/* Background circle */}
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 28 28">
                        <circle
                          cx="14"
                          cy="14"
                          r="12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="opacity-20"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="14"
                          cy="14"
                          r="12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 12}
                          strokeDashoffset={2 * Math.PI * 12 * (1 - transcribeProgress)}
                          className="transition-all duration-100"
                        />
                      </svg>
                      {/* Center icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Mic size={12} strokeWidth={2.5} className="opacity-70" />
                      </div>
                      {/* Pulsing glow */}
                      <div className="absolute inset-0 rounded-full bg-[var(--text-accent)] opacity-10 animate-pulse" />
                    </div>
                  ) : isRecording ? (
                    <AudioLines size={20} strokeWidth={2} className="animate-pulse" />
                  ) : (
                    <Mic size={20} strokeWidth={2} />
                  )}
                  {/* Recording indicator ring */}
                  {isRecording && (
                    <span className="absolute inset-0 border-2 border-[var(--text-accent)] animate-ping opacity-30" />
                  )}

                  {/* Expert Mode Indicator Dot */}
                  {voiceModel === 'expert' && !isRecording && !showProgress && (
                    <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-[var(--text-accent)] rounded-full shadow-[0_0_4px_var(--text-accent)]" />
                  )}
                </button>

                {/* Voice Model Menu */}
                {isVoiceMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setIsVoiceMenuOpen(false)} />
                    <div className="absolute bottom-full right-0 mb-2 w-[240px] bg-[var(--bg-sidebar-solid)] border border-[var(--border-color)] overflow-hidden z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-150 origin-bottom-right shadow-xl">
                      {/* Header */}
                      <div className="px-3 py-2.5 border-b border-[var(--border-color)] bg-[#0f0f0f]">
                        <div className="flex items-center gap-2">
                          <Mic size={12} className="text-[var(--text-accent)]" />
                          <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">Voice Model</span>
                        </div>
                      </div>

                      <div className="p-1.5">
                        {/* Accurate Option */}
                        <button
                          onClick={() => {
                            setVoiceModel('expert');
                            setIsVoiceMenuOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm transition-all duration-150 group relative mb-1",
                            voiceModel === 'expert'
                              ? "bg-[var(--text-accent)]/10 border-l-2 border-l-[var(--text-accent)]"
                              : "hover:bg-[#1e1e1e] border-l-2 border-l-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 flex items-center justify-center border transition-all duration-150",
                            voiceModel === 'expert'
                              ? "bg-[var(--text-accent)] border-[var(--text-accent)] text-black"
                              : "bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-secondary)] group-hover:border-[var(--text-accent)]/50 group-hover:text-[var(--text-accent)]"
                          )}>
                            <Sparkles size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "font-semibold uppercase tracking-[0.1em] text-xs",
                              voiceModel === 'expert' ? "text-[var(--text-accent)]" : "text-[var(--text-primary)]"
                            )}>
                              Accurate
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Slow, very accurate</div>
                          </div>
                          {/* Premium Indicator */}
                          {voiceModel === 'expert' && (
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[var(--text-accent)] rounded-full animate-pulse" />
                          )}
                        </button>

                        {/* Fast Option */}
                        <button
                          onClick={() => {
                            setVoiceModel('fast');
                            setIsVoiceMenuOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm transition-all duration-150 group relative",
                            voiceModel === 'fast'
                              ? "bg-[var(--text-accent)]/10 border-l-2 border-l-[var(--text-accent)]"
                              : "hover:bg-[#1e1e1e] border-l-2 border-l-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 flex items-center justify-center border transition-all duration-150",
                            voiceModel === 'fast'
                              ? "bg-[var(--text-accent)] border-[var(--text-accent)] text-black"
                              : "bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-secondary)] group-hover:border-[var(--text-accent)]/50 group-hover:text-[var(--text-accent)]"
                          )}>
                            <Zap size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "font-semibold uppercase tracking-[0.1em] text-xs",
                              voiceModel === 'fast' ? "text-[var(--text-accent)]" : "text-[var(--text-primary)]"
                            )}>
                              Fast
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Standard accuracy</div>
                          </div>
                        </button>
                      </div>

                      {/* Footer hint */}
                      <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[#0f0f0f]">
                        <p className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">
                          {voiceModel === 'expert' ? 'Slower but extremely accurate' : 'Standard speed & accuracy'}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 h-[40px] mb-[2px]">
            {/* Reasoning Effort Selector - hide in deep-search mode */}
            {chatMode !== 'deep-search' && <div className="relative">
              <button
                onClick={() => setIsEffortMenuOpen(!isEffortMenuOpen)}
                className={cn(
                  "w-10 h-10 border bg-[#1a1a1a] flex items-center justify-center group transition-all duration-150",
                  isEffortMenuOpen
                    ? "border-[var(--text-accent)] text-[var(--text-accent)]"
                    : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)]"
                )}
                title={`Reasoning Effort: ${reasoningEffort}`}
              >
                <Sparkles size={16} strokeWidth={2} className="group-hover:scale-110 transition-transform duration-200" />
              </button>

              {isEffortMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[9998]" onClick={() => setIsEffortMenuOpen(false)} />
                  <div className="absolute bottom-full right-0 mb-2 w-[220px] bg-[var(--bg-sidebar-solid)] border border-[var(--border-color)] overflow-hidden z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-150 origin-bottom-right">
                    {/* Header */}
                    <div className="px-3 py-2.5 border-b border-[var(--border-color)] bg-[#0f0f0f]">
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} className="text-[var(--text-accent)]" />
                        <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">Reasoning Effort</span>
                      </div>
                    </div>

                    <div className="p-1.5">
                      {([
                        { level: 'low' as const, icon: Zap, label: 'Quick', desc: 'Fast responses', bars: 1 },
                        { level: 'medium' as const, icon: Brain, label: 'Balanced', desc: 'Standard reasoning', bars: 2 },
                        { level: 'high' as const, icon: Flame, label: 'Deep', desc: 'Maximum analysis', bars: 3 },
                      ]).map(({ level, icon: Icon, label, desc, bars }) => {
                        const isSelected = reasoningEffort === level;
                        return (
                          <button
                            key={level}
                            onClick={() => {
                              onReasoningEffortChange(level);
                              setIsEffortMenuOpen(false);
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

                            {/* Intensity Bars */}
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3].map((bar) => (
                                <div
                                  key={bar}
                                  className={cn(
                                    "w-1 transition-all duration-150",
                                    bar === 1 ? "h-2" : bar === 2 ? "h-3" : "h-4",
                                    bar <= bars
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
                        Higher effort = deeper thinking
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>}

            {isLoading ? (
              <button
                onClick={onStop}
                className="w-10 h-10 border-2 border-[var(--text-accent)] bg-[#1a1a1a] text-[var(--text-accent)] hover:bg-[var(--text-accent)] hover:text-black transition-all duration-150 flex items-center justify-center"
              >
                <Square size={12} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={onSend}
                disabled={!canSend}
                className={cn(
                  "w-10 h-10 transition-all duration-150 flex items-center justify-center border",
                  canSend
                    ? "bg-[var(--text-accent)] text-black border-[var(--text-accent)] hover:bg-[#1a1a1a] hover:text-[var(--text-accent)]"
                    : "bg-[#1a1a1a] text-[var(--text-secondary)] border-[var(--border-color)] cursor-not-allowed opacity-50"
                )}
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        src={lightboxSrc}
        alt={lightboxAlt}
        isOpen={isLightboxOpen}
        onClose={closeLightbox}
      />
    </div>
  );
}

// Attachment Card Component
interface AttachmentCardProps {
  attachment: AttachmentItem;
  onRemove: () => void;
  onImageClick?: (src: string, alt?: string) => void;
}

function AttachmentCard({ attachment, onRemove, onImageClick }: AttachmentCardProps) {
  // Use original media type for display, but actual mediaType for logic
  const displayMediaType = attachment.originalMediaType || attachment.mediaType;
  const isImage = displayMediaType.startsWith('image/');

  // Get file extension from original type or filename
  const getFileExt = () => {
    const ext = attachment.name.split('.').pop()?.toUpperCase();
    if (ext) return ext;
    return displayMediaType.split('/')[1]?.toUpperCase() || 'FILE';
  };
  const fileExt = getFileExt();

  // Smart filename truncation - keeps extension visible
  const truncateFilename = (name: string, maxLength: number = 24): string => {
    if (name.length <= maxLength) return name;

    const lastDot = name.lastIndexOf('.');
    const ext = lastDot > 0 ? name.slice(lastDot) : '';
    const baseName = lastDot > 0 ? name.slice(0, lastDot) : name;

    // Reserve space for extension + ellipsis
    const availableForBase = maxLength - ext.length - 3; // 3 for "..."

    if (availableForBase <= 4) {
      // Not enough space, just truncate from end
      return name.slice(0, maxLength - 3) + '...';
    }

    // Show start of basename + ... + extension
    const startChars = Math.ceil(availableForBase * 0.7);
    return baseName.slice(0, startChars) + '...' + ext;
  };

  const displayName = truncateFilename(attachment.name);
  const needsTooltip = attachment.name !== displayName;

  return (
    <div className="relative group flex-shrink-0">
      <div
        className="bg-[#141414] border border-[var(--border-color)] rounded-md overflow-hidden hover:border-[var(--text-accent)]/50 transition-all duration-150"
        title={needsTooltip ? attachment.name : undefined}
      >
        {isImage ? (
          <div
            className="relative !w-[40px] !h-[40px] md:!w-[64px] md:!h-[64px] cursor-pointer"
            onClick={() => attachment.previewUrl && onImageClick?.(attachment.previewUrl, attachment.name)}
          >
            {attachment.previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={attachment.previewUrl}
                alt={attachment.name}
                className="w-full h-full object-cover hover:opacity-80 transition-opacity"
              />
            ) : (
              <div className="w-full h-full bg-[#0f0f0f] flex items-center justify-center">
                <FileIcon className="text-[var(--text-secondary)]" size={20} />
              </div>
            )}
            {/* Image type badge - Hidden on mobile */}
            <div className="hidden md:flex absolute bottom-0.5 left-0.5 px-1 py-0.5 bg-black/80 border border-[var(--border-color)] rounded-[2px]">
              <span className="text-[7px] uppercase tracking-wider text-[var(--text-accent)] font-semibold">{fileExt}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-1.5 !h-[40px] md:!h-[64px] max-w-[180px] md:max-w-[200px]">
            {/* File Icon Box */}
            <div className="w-6 h-6 md:w-8 md:h-8 bg-[#0f0f0f] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0 group-hover:border-[var(--text-accent)]/50 group-hover:text-[var(--text-accent)] transition-all duration-150 rounded-sm">
              <FileIcon className="text-[var(--text-secondary)] group-hover:text-[var(--text-accent)]" size={12} />
            </div>

            {/* File Info */}
            <div className="flex flex-col overflow-hidden min-w-0 flex-1 justify-center">
              <span
                className="text-[10px] font-medium text-[var(--text-primary)] truncate"
                title={needsTooltip ? attachment.name : undefined}
              >
                {displayName}
              </span>
              {/* File Type Badge - Hidden on mobile */}
              <span className="hidden md:inline-flex mt-0.5">
                <span className="text-[7px] uppercase tracking-wider px-1 py-px bg-[var(--text-accent)]/10 border border-[var(--text-accent)]/30 text-[var(--text-accent)] font-semibold rounded-[2px]">
                  {fileExt}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Upload Progress Overlay */}
        {attachment.isUploading && (
          <div className="absolute inset-0 bg-[#0f0f0f]/95 flex flex-col items-center justify-center gap-1 backdrop-blur-sm z-20 rounded-md">
            <CircularProgress
              progress={attachment.progress}
              size={isImage ? 28 : 20}
              strokeWidth={2.5}
              showLabel={false}
            />
            <span className="text-[8px] text-[var(--text-accent)] font-medium">{Math.round(attachment.progress)}%</span>
          </div>
        )}

        {/* Error Overlay */}
        {attachment.error && (
          <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center gap-1 backdrop-blur-sm z-20 p-2">
            <span className="text-[8px] text-red-200 text-center">{attachment.error}</span>
          </div>
        )}
      </div>

      {/* Remove button - Floating outside top-right */}
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-5 h-5 bg-[#0f0f0f] text-[var(--text-secondary)] border border-[var(--border-color)] flex items-center justify-center transition-all duration-150 hover:bg-[var(--text-accent)] hover:text-black hover:border-[var(--text-accent)] rounded-full z-30 shadow-sm"
      >
        <X size={10} />
      </button>
    </div>
  );
}


