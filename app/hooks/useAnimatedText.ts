'use client';

import { useState, useEffect } from 'react';
import { useMotionValue, animate } from 'framer-motion';

interface UseAnimatedTextOptions {
    /** Delimiter for splitting text. Empty string = character by character, ' ' = word by word */
    delimiter?: string;
    /** Duration in seconds for the animation */
    duration?: number;
    /** Easing function name */
    ease?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'circIn' | 'circOut' | 'circInOut';
    /** Whether animation is enabled (typically true during streaming) */
    enabled?: boolean;
}

/**
 * Hook that animates text reveal with smooth Framer Motion animations.
 * 
 * When streaming text comes in chunks, this hook smoothly animates the cursor
 * position to reveal text progressively. It automatically "catches up" when
 * new chunks arrive, and handles text resets (new conversation) properly.
 * 
 * Based on the pattern from: https://www.youtube.com/watch?v=vgICBsz5Qtc
 */
export function useAnimatedText(
    text: string,
    options: UseAnimatedTextOptions = {}
): string {
    const {
        delimiter = ' ', // Word by word by default
        duration = 5,
        ease = 'circOut',
        enabled = true,
    } = options;

    // Use motion value for performant animation (outside React render cycle)
    const animatedCursor = useMotionValue(0);

    // Cursor position as React state (for re-rendering)
    const [cursor, setCursor] = useState(0);

    // Track previous text to detect resets
    const [prevText, setPrevText] = useState(text);
    const [isSameText, setIsSameText] = useState(true);

    // Detect text resets (new conversation) vs appending (streaming)
    if (prevText !== text) {
        const startsWith = text.startsWith(prevText);
        setIsSameText(startsWith);
        setPrevText(text);

        // If it's a completely new text (doesn't start with previous), reset cursor
        if (!startsWith) {
            setCursor(0);
            animatedCursor.jump(0);
        }
    }

    // Calculate animation target based on delimiter
    const units = delimiter === '' ? text : text.split(delimiter);
    const targetLength = Array.isArray(units) ? units.length : text.length;

    // Animate cursor to target
    useEffect(() => {
        if (!enabled) {
            // When not enabled, immediately show all text
            setCursor(targetLength);
            return;
        }

        const controls = animate(animatedCursor, targetLength, {
            duration,
            ease,
            onUpdate: (latest) => {
                setCursor(Math.floor(latest));
            },
        });

        return () => controls.stop();
    }, [animatedCursor, targetLength, duration, ease, enabled]);

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
        const words = text.split(delimiter);
        return words.slice(0, cursor).join(delimiter);
    }
}

export default useAnimatedText;
