'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, Paperclip, Square, Sparkles, X, File as FileIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttachmentItem } from '@/app/hooks/useAttachments';
import type { ReasoningEffortLevel } from '@/app/hooks/usePersistedSettings';
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
  disabled?: boolean;
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
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEffortMenuOpen, setIsEffortMenuOpen] = useState(false);

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

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex gap-3 overflow-x-auto px-1 py-2 mb-2">
            {attachments.map((attachment) => (
              <AttachmentCard
                key={attachment.id}
                attachment={attachment}
                onRemove={() => onRemoveAttachment(attachment.id)}
              />
            ))}
          </div>
        )}

        {hasPendingAttachments && (
          <div className="px-1 mb-2 text-xs text-[var(--text-accent)] flex items-center gap-2">
            <Spinner size="xs" variant="accent" />
            <span>Preparing {attachments.filter(a => a.isUploading).length} file(s)...</span>
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Paperclip Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 border border-[var(--border-color)] bg-[#141414] text-[var(--text-secondary)] hover-glow flex items-center justify-center mb-[2px] group"
          >
            <Paperclip size={18} strokeWidth={2} className="group-hover:rotate-12 transition-transform duration-300" />
          </button>

          <div className="flex-1">
            <div className="border border-[var(--border-color)] bg-transparent flex items-end p-2 gap-2 hover-glow transition-all duration-300">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={onPaste}
                onFocus={handleFocus}
                placeholder="Let's crack..."
                autoResize
                maxHeight={200}
                rows={1}
                disabled={disabled}
                className="pb-1 no-outline"
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center gap-2 h-[40px] mb-[2px]">
            {/* Reasoning Effort Selector */}
            <div className="relative">
              <button
                onClick={() => setIsEffortMenuOpen(!isEffortMenuOpen)}
                className="w-10 h-10 border border-[var(--border-color)] bg-[#141414] text-[var(--text-secondary)] hover-glow flex items-center justify-center group"
                title={`Reasoning Effort: ${reasoningEffort}`}
              >
                <Sparkles size={18} strokeWidth={2} className="group-hover:rotate-12 transition-transform duration-300" />
              </button>

              {isEffortMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[9998]" onClick={() => setIsEffortMenuOpen(false)} />
                  <div className="absolute bottom-full right-0 mb-2 w-[180px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] overflow-hidden z-[9999] p-1 animate-in fade-in slide-in-from-bottom-2 duration-100 origin-bottom-right">
                    <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">Reasoning Effort</div>

                    {(['low', 'medium', 'high'] as const).map((effort) => (
                      <button
                        key={effort}
                        onClick={() => {
                          onReasoningEffortChange(effort);
                          setIsEffortMenuOpen(false);
                        }}
                        className="flex items-center justify-between w-full text-left px-2 py-2 hover:bg-[#1e1e1e] text-sm transition-colors"
                      >
                        <span className="text-[var(--text-primary)] capitalize">{effort}</span>
                        {reasoningEffort === effort && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {isLoading ? (
              <button
                onClick={onStop}
                className="w-10 h-10 border border-[var(--text-accent)] bg-black text-[var(--text-accent)] hover:bg-[var(--text-accent)] hover:text-black transition-all duration-150 flex items-center justify-center"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={onSend}
                disabled={!canSend}
                className={cn(
                  "w-10 h-10 transition-all duration-150 flex items-center justify-center border",
                  canSend
                    ? "bg-[var(--text-accent)] text-black border-[var(--text-accent)] hover:bg-black hover:text-[var(--text-accent)]"
                    : "bg-[#1a1a1a] text-[var(--text-secondary)] border-[var(--border-color)] cursor-not-allowed"
                )}
              >
                <ArrowUp size={18} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Attachment Card Component
interface AttachmentCardProps {
  attachment: AttachmentItem;
  onRemove: () => void;
}

function AttachmentCard({ attachment, onRemove }: AttachmentCardProps) {
  return (
    <div className="relative group flex-shrink-0 bg-[#1a1a1a] border border-[var(--border-color)] overflow-hidden">
      {attachment.mediaType.startsWith('image/') ? (
        <div className="w-24 h-24 relative">
          {attachment.previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={attachment.previewUrl}
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#141414] flex items-center justify-center">
              <FileIcon className="text-[var(--text-secondary)]" size={24} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2 min-w-[180px]">
          <div className="w-10 h-10 bg-[#141414] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
            <FileIcon className="text-[var(--text-secondary)]" size={18} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[120px]">
              {attachment.name}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {attachment.mediaType.split('/')[1]?.toUpperCase() || 'FILE'}
            </span>
          </div>
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 w-5 h-5 bg-black/80 text-[var(--text-accent)] border border-[var(--border-color)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--text-accent)] hover:text-black"
      >
        <X size={12} />
      </button>

      {/* Upload Progress Overlay */}
      {attachment.isUploading && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
          <CircularProgress progress={attachment.progress} size={48} />
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
            {attachment.progress < 100 ? 'Uploading...' : 'Processing...'}
          </span>
        </div>
      )}
    </div>
  );
}
