'use client';

import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { MessageItem } from './MessageItem';
import { LoadingIndicator } from './LoadingIndicator';
import type { MessagePart } from '@/lib/chat-types';

// AI Indicator - animated signal pulse with scan effect (matches MessageItem)
function AIIndicator() {
  return (
    <div className="flex-shrink-0 pt-[2px] group/indicator">
      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Outer frame - corner brackets */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-[5px] h-[1px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute top-0 left-0 w-[1px] h-[5px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute top-0 right-0 w-[5px] h-[1px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute top-0 right-0 w-[1px] h-[5px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute bottom-0 left-0 w-[5px] h-[1px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute bottom-0 left-0 w-[1px] h-[5px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute bottom-0 right-0 w-[5px] h-[1px] bg-[var(--text-accent)] opacity-60" />
          <div className="absolute bottom-0 right-0 w-[1px] h-[5px] bg-[var(--text-accent)] opacity-60" />
        </div>
        {/* Inner core - pulsing dot */}
        <div className="w-[4px] h-[4px] bg-[var(--text-accent)] animate-pulse" />
        {/* Scan line on hover */}
        <div className="absolute inset-0 overflow-hidden opacity-0 group-hover/indicator:opacity-100">
          <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--text-accent)] to-transparent animate-[scan_1s_ease-in-out_infinite]"
            style={{ animation: 'scan 1.2s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  );
}

interface ResumedStreamingMessageProps {
  partialText: string;
  partialReasoning: string;
  isStillStreaming: boolean;
  startedAt?: string;
  lastUpdateAt?: string;
}

// Tick interval in ms (lower = faster)
const TICK_INTERVAL = 16;
// When resuming, how fast to "catch up" to current content (chars per tick)
// Reduced from 50 to 8 for smoother catch-up
const CATCH_UP_CHARS_PER_TICK = 8;
// After catching up, use normal speed
// Reduced from 3 to 1 for smoother typing effect
const NORMAL_CHARS_PER_TICK = 1;

export const ResumedStreamingMessage = memo(function ResumedStreamingMessage({
  partialText,
  partialReasoning,
  isStillStreaming,
  startedAt,
}: ResumedStreamingMessageProps) {
  // Track how much content we've "revealed" so far
  const [revealedReasoningLength, setRevealedReasoningLength] = useState(0);
  const [revealedTextLength, setRevealedTextLength] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Track if we're in "catch up" mode (revealing cached content quickly)
  const [isCatchingUp, setIsCatchingUp] = useState(true);
  const prevTextLengthRef = useRef(0);
  const prevReasoningLengthRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Initialize lastTickRef in effect to avoid impure render
  useEffect(() => {
    lastTickRef.current = Date.now();
  }, []);

  // Calculate time since generation started for display
  useEffect(() => {
    if (!startedAt) return;
    const updateElapsed = () => {
      const started = new Date(startedAt).getTime();
      setElapsedSeconds(Math.floor((Date.now() - started) / 1000));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Animate the reveal
  useEffect(() => {
    const animate = () => {
      const now = Date.now();

      // Initialize lastTickRef if not set
      if (lastTickRef.current === 0) {
        lastTickRef.current = now;
      }

      const elapsed = now - lastTickRef.current;

      if (elapsed >= TICK_INTERVAL) {
        lastTickRef.current = now;

        const charsPerTick = isCatchingUp ? CATCH_UP_CHARS_PER_TICK : NORMAL_CHARS_PER_TICK;

        // First reveal reasoning, then text
        setRevealedReasoningLength(prev => {
          if (prev < partialReasoning.length) {
            const next = Math.min(prev + charsPerTick, partialReasoning.length);
            return next;
          }
          return prev;
        });

        setRevealedTextLength(prev => {
          // Only start revealing text once reasoning is fully revealed
          if (revealedReasoningLength >= partialReasoning.length) {
            if (prev < partialText.length) {
              const next = Math.min(prev + charsPerTick, partialText.length);
              return next;
            }
          }
          return prev;
        });

        // Check if we've caught up to the current content
        if (revealedReasoningLength >= prevReasoningLengthRef.current &&
          revealedTextLength >= prevTextLengthRef.current) {
          setIsCatchingUp(false);
        }
      }

      // Continue animating if there's more to reveal
      if (revealedReasoningLength < partialReasoning.length ||
        revealedTextLength < partialText.length ||
        isStillStreaming) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [partialText, partialReasoning, revealedReasoningLength, revealedTextLength, isStillStreaming, isCatchingUp]);

  // Track when new content arrives from server
  useEffect(() => {
    if (partialText.length > prevTextLengthRef.current ||
      partialReasoning.length > prevReasoningLengthRef.current) {
      // New content arrived, continue at normal speed if we were caught up
      prevTextLengthRef.current = partialText.length;
      prevReasoningLengthRef.current = partialReasoning.length;
    }
  }, [partialText, partialReasoning]);

  // Build content parts for display
  const displayContent = useMemo((): MessagePart[] => {
    const parts: MessagePart[] = [];

    // Add revealed reasoning
    if (partialReasoning && revealedReasoningLength > 0) {
      const revealedReasoning = partialReasoning.slice(0, revealedReasoningLength);
      parts.push({ type: 'reasoning', text: revealedReasoning });
    }

    // Add revealed text
    if (partialText && revealedTextLength > 0) {
      const revealedText = partialText.slice(0, revealedTextLength);
      parts.push({ type: 'text', text: revealedText });
    }

    return parts;
  }, [partialText, partialReasoning, revealedTextLength, revealedReasoningLength]);

  // Show loading indicator if we have no content yet
  if (displayContent.length === 0) {
    return (
      <div className="w-full mb-6">
        <div className="flex items-start gap-3">
          <AIIndicator />
          <div className="flex-1">
            <LoadingIndicator />
            <div className="text-xs text-[var(--text-secondary)] mt-2">
              Resuming generation... ({elapsedSeconds}s elapsed)
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isFullyRevealed = revealedReasoningLength >= partialReasoning.length &&
    revealedTextLength >= partialText.length;

  return (
    <div className="relative">
      <MessageItem
        role="assistant"
        content={displayContent}
        isThinking={isStillStreaming || !isFullyRevealed}
        isStreaming={isStillStreaming || !isFullyRevealed}
        onEdit={() => { }}
        onRetry={() => { }}
      />
      {isStillStreaming && (
        <div className="text-xs text-[var(--text-secondary)] mt-1 ml-[52px] animate-pulse">
          Generating in background... ({elapsedSeconds}s)
        </div>
      )}
    </div>
  );
});

export default ResumedStreamingMessage;
