'use client';

import React, { useRef, useEffect, useState, memo, useCallback } from 'react';
import type { ChatMessage, MessagePart } from '@/lib/chat-types';
import { MessageItem } from './MessageItem';
import { Skeleton } from './Skeleton';
import { LoadingIndicator } from './LoadingIndicator';

import { FadeWrapper, ErrorAlert } from '@/components/ui';
import { Sparkles, Code, Lightbulb, PenLine, Zap, ArrowRight } from 'lucide-react';
import type { ChatMode, LearningSubMode } from '@/app/hooks/usePersistedSettings';

// Autoscroll hook - improved with requestAnimationFrame and near-bottom detection
function useAutoScroll(
  isStreaming: boolean,
  userMessageCount: number  // Track user messages specifically, not total
) {
  // Core refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);

  // State for tracking user interaction
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const isAutoScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const prevUserMessageCountRef = useRef(userMessageCount);
  const initialScrollDoneRef = useRef(true); // Flag to prevent streaming from overriding initial scroll

  // Threshold for "near bottom" detection (in pixels)
  const NEAR_BOTTOM_THRESHOLD = 150;

  // Check if scrolled near bottom
  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < NEAR_BOTTOM_THRESHOLD;
  }, []);

  // Scroll to position user message near the TOP of viewport
  const scrollToUserMessage = useCallback(() => {
    const container = scrollContainerRef.current;
    const userMessage = lastUserMessageRef.current;
    if (!container || !userMessage) return;

    isAutoScrollingRef.current = true;

    // Get the user message position relative to container
    const messageRect = userMessage.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const offsetFromContainerTop = messageRect.top - containerRect.top + container.scrollTop;

    // Scroll so user message is near top with some padding (80px from top)
    const targetScroll = offsetFromContainerTop - 80;

    container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });

    // Reset flag after scroll completes
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isAutoScrollingRef.current = false;
      });
    });
  }, []);

  // Smooth scroll to bottom using scrollTop (for streaming)
  const scrollToBottom = useCallback((smooth = false) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    isAutoScrollingRef.current = true;
    const targetScroll = container.scrollHeight - container.clientHeight;

    if (smooth) {
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    } else {
      container.scrollTop = targetScroll;
    }

    // Reset flag after scroll completes using double rAF for safety
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isAutoScrollingRef.current = false;
      });
    });
  }, []);

  // Handle scroll events - detect user scrolling up
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Ignore auto-triggered scrolls
      if (isAutoScrollingRef.current) return;

      const currentScrollTop = container.scrollTop;
      const delta = currentScrollTop - lastScrollTopRef.current;

      // User scrolled up significantly - pause auto-scroll
      if (delta < -10) {
        setUserHasScrolledUp(true);
      }

      // User scrolled down and is near bottom - resume auto-scroll
      if (isNearBottom()) {
        setUserHasScrolledUp(false);
      }

      lastScrollTopRef.current = currentScrollTop;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isNearBottom]);

  // Auto-scroll during streaming using requestAnimationFrame
  useEffect(() => {
    // Don't start streaming auto-scroll until initial scroll is done
    if (!isStreaming || userHasScrolledUp || !initialScrollDoneRef.current) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    let lastTime = 0;
    const SCROLL_INTERVAL = 100; // Only scroll every 100ms max

    const tick = (time: number) => {
      if (time - lastTime >= SCROLL_INTERVAL) {
        // Only auto-scroll if near bottom and initial scroll is complete
        if (isNearBottom() && initialScrollDoneRef.current) {
          scrollToBottom(false);
        }
        lastTime = time;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isStreaming, userHasScrolledUp, isNearBottom, scrollToBottom]);

  // Reset state when new streaming starts
  useEffect(() => {
    if (isStreaming) {
      setUserHasScrolledUp(false);
    }
  }, [isStreaming]);

  // Scroll to user message when a NEW USER message is added
  useEffect(() => {
    const prevCount = prevUserMessageCountRef.current;
    prevUserMessageCountRef.current = userMessageCount;

    // Only trigger when a NEW user message is added (not assistant messages)
    if (userMessageCount > prevCount && lastUserMessageRef.current) {
      // Prevent streaming from overriding until we're done
      initialScrollDoneRef.current = false;

      // Delay to let the DOM update fully
      setTimeout(() => {
        scrollToUserMessage();
        // Allow streaming auto-scroll after a delay
        setTimeout(() => {
          initialScrollDoneRef.current = true;
        }, 500);
      }, 200);
    }
  }, [userMessageCount, scrollToUserMessage]);

  return {
    scrollContainerRef,
    messagesEndRef,
    lastUserMessageRef,
    forceScrollToBottom: useCallback(() => {
      setUserHasScrolledUp(false);
      scrollToBottom(true);
    }, [scrollToBottom]),
    isUserPaused: userHasScrolledUp
  };
}


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
  tokensPerSecond,
  onClarifySubmit,
  onSkipClarify,
  chatMode,
  learningSubMode,
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
  onClarifySubmit?: (answers: { q: string; a: string }[]) => void;
  onSkipClarify?: () => void;
  chatMode?: ChatMode;
  learningSubMode?: LearningSubMode;
}) {
  const extractContent = (): string | MessagePart[] => {
    // DEBUG: Log message structure to trace toolInvocations
    const msgToolInvocationsRaw = (message as { toolInvocations?: unknown[] }).toolInvocations;
    if (msgToolInvocationsRaw) {
      // Debug removed
    }

    const msgParts = (message as { parts?: unknown[] }).parts;
    if (Array.isArray(msgParts) && msgParts.length > 0) {
      const partTypes = msgParts.map((p: unknown) => (p as { type?: string })?.type || 'unknown');
      // Debug removed
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
          } else if (p.type === 'generated-image') {
            // Pass through generated images directly
            converted.push({ type: 'generated-image', data: p.data as string, mediaType: p.mediaType as string } as unknown as MessagePart);
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
          } else if (p.type === 'tool-invocation' || (typeof p.type === 'string' && p.type.startsWith('tool-') && p.type !== 'tool-invocation')) {
            // AI SDK v5 uses 'tool-TOOLNAME' format (e.g., 'tool-brave_web_search')
            // Also support legacy 'tool-invocation' format
            const isNewFormat = typeof p.type === 'string' && p.type.startsWith('tool-') && p.type !== 'tool-invocation';
            const nested = p.toolInvocation as { toolCallId?: string; toolName?: string; state?: string; args?: unknown; result?: unknown } | undefined;

            // Extract toolName from type for new format, or from nested object for old format
            const toolNameFromType = isNewFormat ? (p.type as string).replace('tool-', '') : '';
            const toolCallId = (p.toolCallId as string) || nested?.toolCallId || (p.id as string) || `tool-${Date.now()}`;
            const toolName = (p.toolName as string) || nested?.toolName || toolNameFromType || '';

            // AI SDK v5 uses different state names: input-streaming, input-available, output-available, output-error
            const rawState = (p.state as string) || nested?.state || 'call';
            let normalizedState: 'call' | 'result' | 'partial-call' = 'call';
            if (rawState === 'output-available' || rawState === 'result') {
              normalizedState = 'result';
            } else if (rawState === 'input-streaming' || rawState === 'partial-call') {
              normalizedState = 'partial-call';
            }

            const args = (p.args as Record<string, unknown>) || (p.input as Record<string, unknown>) || nested?.args;
            const result = p.result || (p.output as unknown) || nested?.result;

            if (toolName) {
              // Debug removed
              converted.push({
                type: 'tool-invocation',
                toolInvocation: {
                  toolCallId,
                  toolName,
                  state: normalizedState,
                  args: args as Record<string, unknown>,
                  result
                }
              } as MessagePart);
            }
          } else if (p.type === 'stopped') {
            // Pass through stopped indicator with stopType
            converted.push({ type: 'stopped', stopType: p.stopType } as unknown as MessagePart);
          } else if (p.type === 'deep-research-progress') {
            // Pass through deep research progress
            converted.push({ type: 'deep-research-progress', progress: p.progress } as unknown as MessagePart);
          } else if (p.type === 'clarify-questions') {
            // Pass through clarify questions
            converted.push({ type: 'clarify-questions', questions: p.questions } as unknown as MessagePart);
          }
        }
      }

      // Also check for toolInvocations property directly on message (AI SDK v5 useChat streaming format)
      // and merge them into the converted array
      const msgToolInvocations = (message as {
        toolInvocations?: Array<{
          toolCallId: string;
          toolName: string;
          state: 'call' | 'result' | 'partial-call';
          args?: Record<string, unknown>;
          result?: unknown;
        }>
      }).toolInvocations;

      if (msgToolInvocations && msgToolInvocations.length > 0) {
        for (const ti of msgToolInvocations) {
          // Check if already in converted (from parts)
          const existsInParts = converted.some(
            (p): p is MessagePart & { toolInvocation?: { toolCallId: string } } =>
              p.type === 'tool-invocation' &&
              (p as { toolInvocation?: { toolCallId: string } }).toolInvocation?.toolCallId === ti.toolCallId
          );
          if (!existsInParts) {
            converted.push({
              type: 'tool-invocation',
              toolInvocation: {
                toolCallId: ti.toolCallId,
                toolName: ti.toolName,
                state: ti.state,
                args: ti.args,
                result: ti.result
              }
            } as MessagePart);
          }
        }
      }

      // Debug: Log final converted content with tool invocations
      const toolCount = converted.filter(p => p.type === 'tool-invocation').length;
      // Debug removed

      if (converted.length > 0) return converted;
    }

    // Fallback: Check for toolInvocations property when parts is empty
    const msgToolInvocations = (message as {
      toolInvocations?: Array<{
        toolCallId: string;
        toolName: string;
        state: 'call' | 'result' | 'partial-call';
        args?: Record<string, unknown>;
        result?: unknown;
      }>
    }).toolInvocations;

    if (msgToolInvocations && msgToolInvocations.length > 0) {
      const converted: MessagePart[] = [];
      for (const ti of msgToolInvocations) {
        converted.push({
          type: 'tool-invocation',
          toolInvocation: {
            toolCallId: ti.toolCallId,
            toolName: ti.toolName,
            state: ti.state,
            args: ti.args,
            result: ti.result
          }
        } as MessagePart);
      }
      // Also add text content if present
      if (typeof message.content === 'string' && message.content) {
        converted.push({ type: 'text', text: message.content });
      }
      if (converted.length > 0) return converted;
    }

    if (Array.isArray(message.content)) return message.content;
    if (typeof message.content === 'string') return message.content;
    return '';
  };

  const combinedContent = extractContent();
  const throttledContent = useThrottledValue(combinedContent, 16); // ~60fps for smoother streaming

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
      onClarifySubmit={onClarifySubmit}
      onSkipClarify={onSkipClarify}
      chatMode={chatMode}
      learningSubMode={learningSubMode}
    />
  );
});

interface MessageListProps {
  messages: ChatMessage[];
  isMessagesLoading: boolean;
  isSending?: boolean;
  isStreaming: boolean;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  streamingStats: { tokensPerSecond: number; modelId: string | null };
  currentChatId: string | null;
  chatMode?: ChatMode;
  learningSubMode?: LearningSubMode;
  error: Error | null | undefined;
  onEdit: (index: number, content: string, attachments?: EditAttachment[]) => void;
  onRetry: () => void;
  onDismissError: () => void;
  dismissedError: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  onClarifySubmit?: (answers: { q: string; a: string }[]) => void;
  onSkipClarify?: () => void;
}

// Suggestion cards for empty state
const SUGGESTIONS = [
  { icon: Code, label: 'Code', text: 'Help me write a Python script', desc: 'Get coding assistance' },
  { icon: Lightbulb, label: 'Ideas', text: 'Brainstorm ideas for my project', desc: 'Creative thinking' },
  { icon: PenLine, label: 'Write', text: 'Write a professional email', desc: 'Content creation' },
  { icon: Zap, label: 'Explain', text: 'Explain quantum computing simply', desc: 'Learn anything' },
];

export function MessageList({
  messages,
  isMessagesLoading,
  isSending = false,
  isStreaming,
  status,
  streamingStats,
  currentChatId,
  chatMode,
  learningSubMode,
  error,
  onEdit,
  onRetry,
  onDismissError,
  dismissedError,
  onSuggestionClick,
  onClarifySubmit,
  onSkipClarify,
}: MessageListProps) {
  // Count user messages for scroll tracking
  const userMessageCount = messages.filter(m => m.role === 'user').length;

  // Use the new flawless autoscroll hook
  const { scrollContainerRef, messagesEndRef, lastUserMessageRef } = useAutoScroll(
    isStreaming,
    userMessageCount
  );

  // Find the last user message index for scroll positioning
  const lastUserMessageIndex = messages.reduce((lastIdx, m, idx) =>
    m.role === 'user' ? idx : lastIdx, -1
  );

  return (
    <div
      className="flex-1 overflow-y-auto scrollbar-custom"
      ref={scrollContainerRef}
    >
      <div className="max-w-[800px] mx-auto pt-6 pb-6 px-4 md:px-6 relative">
        {/* Loading Skeletons */}
        <FadeWrapper show={isMessagesLoading} isAbsolute className="pt-6 px-4 md:px-6 z-10">
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
            {/* Sending indicator - shows immediately when user clicks send */}
            {isSending && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 flex items-center justify-center border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/10 mb-6 relative">
                    <Sparkles size={28} className="text-[var(--text-accent)] animate-pulse" />
                    <div className="absolute inset-0 border border-[var(--text-accent)] animate-ping opacity-20" />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] uppercase tracking-wider">
                    Starting conversation...
                  </p>
                </div>
              </div>
            )}

            {messages.length === 0 && !currentChatId && !isSending && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
                {/* Welcome Header */}
                <div className="flex flex-col items-center mb-10">
                  <div className="w-16 h-16 flex items-center justify-center border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/10 mb-6">
                    <Sparkles size={28} className="text-[var(--text-accent)]" />
                  </div>
                  <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2 tracking-tight">
                    What can I help with?
                  </h1>
                  <p className="text-sm text-[var(--text-secondary)] max-w-md text-center">
                    Start a conversation or try one of these suggestions
                  </p>
                </div>

                {/* Suggestion Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {SUGGESTIONS.map(({ icon: Icon, label, text, desc }) => (
                    <button
                      key={label}
                      onClick={() => onSuggestionClick?.(text)}
                      className="group flex items-start gap-3 p-4 border border-[var(--border-color)] bg-[#1a1a1a] hover:border-[var(--text-accent)]/50 hover:bg-[#1e1e1e] transition-all duration-150 text-left"
                    >
                      {/* Icon Box */}
                      <div className="w-10 h-10 flex items-center justify-center border border-[var(--border-color)] bg-[#141414] group-hover:border-[var(--text-accent)]/50 group-hover:bg-[var(--text-accent)] group-hover:text-black transition-all duration-150 flex-shrink-0">
                        <Icon size={18} className="text-[var(--text-secondary)] group-hover:text-black transition-colors" />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-accent)]">
                            {label}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-primary)] group-hover:text-[var(--text-accent)] transition-colors line-clamp-1">
                          {text}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                          {desc}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ArrowRight size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--text-accent)] group-hover:translate-x-1 transition-all duration-150 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>

                {/* Footer Hint */}
                <div className="mt-8 flex items-center gap-2 text-[var(--text-secondary)]">
                  <div className="w-1.5 h-1.5 bg-[var(--text-accent)] opacity-60" />
                  <span className="text-[10px] uppercase tracking-wider">
                    Type anything to start
                  </span>
                  <div className="w-1.5 h-1.5 bg-[var(--text-accent)] opacity-60" />
                </div>
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

              // isThinking = true if this is the last assistant message and we're streaming
              const isThinkingForMessage = isStreaming && isLastAssistant;

              return (
                <div
                  key={m.id}
                  ref={index === lastUserMessageIndex && m.role === 'user' ? lastUserMessageRef : undefined}
                >
                  <ThrottledMessageItem
                    message={m}
                    index={index}
                    isThinking={isThinkingForMessage}
                    isStreaming={isThinkingForMessage}
                    onEdit={onEdit}
                    onRetry={onRetry}
                    modelName={modelShortName}
                    fullModelName={displayModelId || undefined}
                    tokensPerSecond={displayTps}
                    onClarifySubmit={onClarifySubmit}
                    onSkipClarify={onSkipClarify}
                    chatMode={chatMode}
                    learningSubMode={(m.learningSubMode as LearningSubMode) || learningSubMode}
                  />
                </div>
              );
            })}

            {/* Loading indicator - only while connecting (waiting for first token) */}
            {status === 'submitted' && (
              <div className="mt-4 flex items-center gap-3 pl-1">
                <LoadingIndicator />
              </div>
            )}

            {/* Error Display */}
            {error && !dismissedError && (
              <ErrorAlert
                message={error?.message || 'An error occurred while processing your request.'}
                onDismiss={onDismissError}
                className="mt-6"
              />
            )}
          </>
        </FadeWrapper>


        {/* Spacer for comfortable scroll positioning */}
        <div className="min-h-[13vh]" />
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
