/**
 * useAnimatedText - Progressive text reveal animation
 * 
 * EXACT PORT from web: app/hooks/useAnimatedText.ts
 * Uses react-native-reanimated instead of framer-motion
 * 
 * Matches web behavior:
 * - Word-by-word animation (delimiter=' ')
 * - 4 second duration
 * - circOut easing (fast start, smooth end)
 * - Handles text resets vs streaming appends
 */

import { useState, useEffect, useRef } from 'react';
import { Easing } from 'react-native-reanimated';

interface UseAnimatedTextOptions {
    /** Delimiter for splitting text. Empty string = character by character, ' ' = word by word */
    delimiter?: string;
    /** Duration in seconds for the animation */
    duration?: number;
    /** Whether animation is enabled (typically true during streaming) */
    enabled?: boolean;
}

/**
 * Hook that animates text reveal with smooth animations.
 * 
 * When streaming text comes in chunks, this hook smoothly animates the cursor
 * position to reveal text progressively. It automatically "catches up" when
 * new chunks arrive, and handles text resets (new conversation) properly.
 */
export function useAnimatedText(
    text: string,
    options: UseAnimatedTextOptions = {}
): string {
    const {
        delimiter = ' ', // Word by word by default (matches web)
        duration = 4,    // 4 seconds (matches web)
        enabled = true,
    } = options;

    // Cursor position as React state
    const [cursor, setCursor] = useState(0);

    // Track previous text to detect resets
    const prevTextRef = useRef(text);
    const animationRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    // Calculate units based on delimiter
    const units = delimiter === '' ? text.split('') : text.split(delimiter);
    const targetLength = units.length;

    // circOut easing function (matches framer-motion)
    // circOut(t) = sqrt(1 - (t - 1)^2)
    const circOut = (t: number): number => {
        return Math.sqrt(1 - Math.pow(t - 1, 2));
    };

    useEffect(() => {
        // Detect text reset vs streaming append
        const prevText = prevTextRef.current;
        const startsWithPrev = text.startsWith(prevText);

        if (!startsWithPrev && prevText !== text) {
            // New text (reset) - start from 0
            setCursor(0);
            startTimeRef.current = Date.now();
        }

        prevTextRef.current = text;

        if (!enabled) {
            // When not enabled, immediately show all text
            setCursor(targetLength);
            return;
        }

        if (targetLength === 0) return;

        // Clear any existing animation
        if (animationRef.current) {
            clearInterval(animationRef.current);
        }

        // Start animation
        if (startTimeRef.current === 0) {
            startTimeRef.current = Date.now();
        }

        const durationMs = duration * 1000;
        const frameInterval = 16; // ~60fps

        animationRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const progress = Math.min(elapsed / durationMs, 1);
            const easedProgress = circOut(progress);
            const newCursor = Math.floor(easedProgress * targetLength);

            setCursor(newCursor);

            if (progress >= 1) {
                if (animationRef.current) {
                    clearInterval(animationRef.current);
                    animationRef.current = null;
                }
            }
        }, frameInterval);

        return () => {
            if (animationRef.current) {
                clearInterval(animationRef.current);
                animationRef.current = null;
            }
        };
    }, [text, targetLength, duration, enabled]);

    // When new text arrives while animating, extend the animation
    useEffect(() => {
        if (enabled && cursor < targetLength) {
            // Reset start time to extend animation for new content
            // But preserve some progress based on current cursor position
            const currentProgress = cursor / targetLength;
            startTimeRef.current = Date.now() - (currentProgress * duration * 1000);
        }
    }, [targetLength]);

    // If animation is disabled, return full text
    if (!enabled) {
        return text;
    }

    // Return the animated portion of the text
    if (delimiter === '') {
        // Character by character
        return text.slice(0, cursor);
    } else {
        // Word by word (or other delimiter)
        return units.slice(0, cursor).join(delimiter);
    }
}

export default useAnimatedText;
