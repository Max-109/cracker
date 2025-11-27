'use client';

import React, { useRef, useEffect, useState, memo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, MessagePart } from '@/lib/chat-types';
import { MessageItem } from './MessageItem';
import { Skeleton } from './Skeleton';
import { LoadingIndicator } from './LoadingIndicator';

// Custom hook for throttling values
function useThrottledValue<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRanRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (lastRanRef.current === 0) {
      lastRanRef.current = now;
      return;
    }

    const elapsed = now - lastRanRef.current;
    const delay = Math.max(limit - elapsed, 0);

    const handler = window.setTimeout(() => {
      setThrottledValue(value);
      lastRanRef.current = Date.now();
    }, delay);

    return () => clearTimeout(handler);
  }, [value, limit]);

  return throttledValue;
}

// Smooth Fade Wrapper for Skeletons/Content
function FadeWrapper({ show, children, className }: { show: boolean; children: React.ReactNode; className?: string }) {
  const [shouldRender, setShouldRender] = useState(show);
  const [isFadingIn, setIsFadingIn] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (show) {
      setShouldRender(true);
      requestAnimationFrame(() => setIsFadingIn(true));
    } else {
      setIsFadingIn(false);
      timeout = setTimeout(() => setShouldRender(false), 300);
    }
    return () => { if (timeout) clearTimeout(timeout); };
  }, [show]);

  if (!shouldRender) return null;

  return (
    <div className={cn("transition-opacity duration-300", isFadingIn ? "opacity-100" : "opacity-0", className)}>
      {children}
    </div>
  );
}

type EditAttachment = { id: string; url: string; name: string; mediaType: string };

const ThrottledMessageItem = memo(function ThrottledMessageItem({ 
  message, 
  index, 
  isThinking, 
  isStreaming, 
  onEdit, 
  onRetry, 
  modelName, 
  fullModelName, 
  tokensPerSecond 
}: { 
  message: ChatMessage; 
  index: number; 
  isThinking: boolean; 
  isStreaming?: boolean; 
  onEdit: (index: number, content: string, attachments?: EditAttachment[]) => void; 
  onRetry: () => void; 
  modelName?: string; 
  fullModelName?: string; 
  tokensPerSecond?: number;
}) {
  const extractContent = (): string | MessagePart[] => {
    const msgParts = (message as { parts?: unknown[] }).parts;
    if (Array.isArray(msgParts) && msgParts.length > 0) {
      const converted: MessagePart[] = [];
      for (const part of msgParts) {
        if (typeof part === 'object' && part !== null) {
          const p = part as Record<string, unknown>;
          if (p.type === 'text' && typeof p.text === 'string') {
            converted.push({ type: 'text', text: p.text });
          } else if (p.type === 'reasoning' && typeof p.text === 'string') {
            converted.push({ type: 'reasoning', text: p.text });
          } else if (p.type === 'image') {
            const imageUrl = (p.url || p.image) as string;
            converted.push({ type: 'image', image: imageUrl, mediaType: p.mediaType as string, name: p.filename as string });
          } else if (p.type === 'file') {
            const fileData = (p.url || p.data) as string;
            const fileName = (p.filename || p.name) as string;
            const mimeType = (p.mediaType || p.mimeType) as string;
            converted.push({ type: 'file', data: fileData, url: fileData, mediaType: mimeType, name: fileName, filename: fileName });
          } else if (p.type === 'source' || p.type === 'source-url') {
            const url = (p.url || (p.source as { url?: string })?.url) as string | undefined;
            const title = (p.title || (p.source as { title?: string })?.title) as string | undefined;
            const id = (p.id || (p.source as { id?: string })?.id || url) as string | undefined;
            if (url) {
              converted.push({ 
                type: 'source', 
                source: { sourceType: 'url', id: id || url, url: url, title: title } 
              } as MessagePart);
            }
          } else if (p.type === 'tool-invocation') {
            const nested = p.toolInvocation as { toolCallId?: string; toolName?: string; state?: string; args?: unknown; result?: unknown } | undefined;
            const toolCallId = (p.toolCallId as string) || nested?.toolCallId || '';
            const toolName = (p.toolName as string) || nested?.toolName || '';
            const state = (p.state as string) || nested?.state || 'call';
            const args = (p.args as Record<string, unknown>) || nested?.args;
            const result = p.result || nested?.result;
            if (toolName) {
              converted.push({
                type: 'tool-invocation',
                toolInvocation: {
                  toolCallId,
                  toolName,
                  state: state as 'call' | 'result' | 'partial-call',
                  args: args as Record<string, unknown>,
                  result
                }
              } as MessagePart);
            }
          }
        }
      }
      if (converted.length > 0) return converted;
    }
    
    if (Array.isArray(message.content)) return message.content;
    if (typeof message.content === 'string') return message.content;
    return '';
  };

  const combinedContent = extractContent();
  const throttledContent = useThrottledValue(combinedContent, 50);

  const handleEdit = React.useCallback((newContent: string, attachments?: EditAttachment[]) => {
    onEdit(index, newContent, attachments);
  }, [onEdit, index]);

  return (
    <MessageItem 
      role={message.role} 
      content={throttledContent} 
      isThinking={isThinking} 
      isStreaming={isStreaming} 
      onEdit={handleEdit} 
      onRetry={onRetry} 
      modelName={modelName} 
      fullModelName={fullModelName} 
      tokensPerSecond={tokensPerSecond} 
    />
  );
});

interface ActiveGeneration {
  id: string;
  status: 'streaming' | 'completed' | 'failed';
  partialText?: string;
  partialReasoning?: string;
}

interface MessageListProps {
  messages: ChatMessage[];
  isMessagesLoading: boolean;
  isStreaming: boolean;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  activeGeneration: ActiveGeneration | null;
  streamingStats: { tokensPerSecond: number; modelId: string | null };
  currentChatId: string | null;
  error: Error | null | undefined;
  onEdit: (index: number, content: string, attachments?: EditAttachment[]) => void;
  onRetry: () => void;
  onDismissError: () => void;
  dismissedError: boolean;
}

export function MessageList({
  messages,
  isMessagesLoading,
  isStreaming,
  status,
  activeGeneration,
  streamingStats,
  currentChatId,
  error,
  onEdit,
  onRetry,
  onDismissError,
  dismissedError,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const userScrolledUpRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    if (scrollTop < lastScrollTopRef.current - 10) {
      userScrolledUpRef.current = true;
    }
    lastScrollTopRef.current = scrollTop;
    
    const threshold = 100;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;
    
    if (isAtBottom) {
      userScrolledUpRef.current = false;
    }
    
    setShouldAutoScroll(isAtBottom && !userScrolledUpRef.current);
  };

  useEffect(() => {
    if (shouldAutoScroll && scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: "smooth"
      });
    }
  }, [messages, shouldAutoScroll]);

  // Reset scroll on new message
  const resetScroll = () => {
    userScrolledUpRef.current = false;
    setShouldAutoScroll(true);
  };

  return (
    <div
      className="flex-1 overflow-y-auto scroll-smooth"
      ref={scrollContainerRef}
      onScroll={handleScroll}
    >
      <div className="max-w-[800px] mx-auto pt-6 pb-6 px-4 md:px-6 relative">
        {/* Loading Skeletons */}
        <FadeWrapper show={isMessagesLoading} className="absolute inset-0 pt-6 px-4 md:px-6 z-10">
          <div className="space-y-10">
            <div className="flex justify-end">
              <Skeleton className="h-12 w-[60%]" />
            </div>
            <div className="flex justify-start gap-4">
              <div className="space-y-3 w-full max-w-[90%]">
                <Skeleton className="h-4 w-[30%]" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[95%]" />
                  <Skeleton className="h-4 w-[88%]" />
                  <Skeleton className="h-4 w-[92%]" />
                  <Skeleton className="h-4 w-[60%]" />
                </div>
                <div className="pt-2 space-y-2">
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[85%]" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-[40%]" />
            </div>
          </div>
        </FadeWrapper>

        {/* Actual Content */}
        <FadeWrapper show={!isMessagesLoading} className="relative z-0">
          <>
            {messages.length === 0 && !currentChatId && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-100">
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Hi!</h2>
              </div>
            )}

            {messages.map((m: ChatMessage, index: number) => {
              const isLastAssistant = index === messages.length - 1 && m.role === 'assistant';
              const messageModel = (m as { model?: string }).model;
              const messageTps = (m as { tokensPerSecond?: string }).tokensPerSecond;
              const displayModelId = m.role === 'assistant' 
                ? (messageModel || (isLastAssistant ? streamingStats.modelId : null) || null)
                : null;
              const displayTps = m.role === 'assistant'
                ? (messageTps ? parseFloat(messageTps) : (isLastAssistant ? streamingStats.tokensPerSecond : undefined))
                : undefined;
              const modelShortName = displayModelId ? (displayModelId.split('/').pop()?.split(':')[0] || displayModelId) : undefined;
              
              return (
                <ThrottledMessageItem
                  key={m.id}
                  message={m}
                  index={index}
                  isThinking={isStreaming && isLastAssistant}
                  isStreaming={isStreaming && isLastAssistant}
                  onEdit={onEdit}
                  onRetry={onRetry}
                  modelName={modelShortName}
                  fullModelName={displayModelId || undefined}
                  tokensPerSecond={displayTps}
                />
              );
            })}

            {/* Loading indicator when waiting */}
            {status === 'submitted' && (
              <div className="mt-8 border-t border-[var(--border-color)] pt-4">
                <LoadingIndicator />
              </div>
            )}
            
            {/* Background generation partial content */}
            {activeGeneration?.status === 'streaming' && !isStreaming && (
              <div className="w-full mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-[var(--text-secondary)] text-[11px] uppercase tracking-[0.18em] leading-none pt-[2px] flex-shrink-0">[AI]:</span>
                  <div className="flex-1 text-[#E5E5E5] leading-relaxed">
                    {activeGeneration.partialReasoning && (
                      <div className="border border-[var(--border-color)] bg-[#141414] p-3 mb-3">
                        <div className="text-xs uppercase tracking-[0.12em] text-[var(--text-accent)] mb-2 animate-pulse">
                          Thinking...
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                          {activeGeneration.partialReasoning}
                        </div>
                      </div>
                    )}
                    {activeGeneration.partialText && (
                      <div className="whitespace-pre-wrap">{activeGeneration.partialText}</div>
                    )}
                    {!activeGeneration.partialText && !activeGeneration.partialReasoning && (
                      <LoadingIndicator />
                    )}
                    <div className="text-xs text-[var(--text-secondary)] mt-2 animate-pulse">
                      Generating in background...
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && !dismissedError && (
              <div className="mt-6 p-4 bg-red-950/50 border border-red-500/50 relative">
                <button 
                  onClick={onDismissError}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-300"
                >
                  <X size={16} />
                </button>
                <div className="flex items-start gap-3">
                  <div className="text-red-400 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-1">Error</h4>
                    <p className="text-sm text-red-300/90">{error?.message || 'An error occurred while processing your request.'}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        </FadeWrapper>

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

// Export resetScroll helper for parent component
export { FadeWrapper };
