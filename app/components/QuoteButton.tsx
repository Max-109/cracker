'use client';

import { useState, useEffect, useRef } from 'react';
import { Quote as QuoteIcon } from 'lucide-react';
import { useQuoteContext } from './QuoteContext';
import { cn } from '@/lib/utils';

export function QuoteButton() {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { addQuote } = useQuoteContext();

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setIsVisible(false);
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length === 0) {
        setIsVisible(false);
        return;
      }

      // Get the range and its bounding rectangle
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        setIsVisible(false);
        return;
      }

      // Check if the selection is within a message content area (not input/textarea)
      const anchorNode = selection.anchorNode;
      if (anchorNode && anchorNode.nodeType === Node.ELEMENT_NODE) {
        const element = anchorNode as HTMLElement;
        // Don't show quote button for input areas
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' ||
            element.classList.contains('chat-input') || element.closest('.chat-input')) {
          setIsVisible(false);
          return;
        }
      }

      // Improved positioning with better edge case handling
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate position with bounds checking
      let top = rect.top + window.scrollY - 40;
      let left = rect.left + window.scrollX + rect.width / 2 - 20;

      // Ensure button stays within viewport
      const buttonWidth = 40; // Approximate button width
      const buttonHeight = 40; // Approximate button height

      // Adjust horizontal position if near viewport edges
      if (left < 10) {
        left = 10;
      } else if (left + buttonWidth > viewportWidth - 10) {
        left = viewportWidth - buttonWidth - 10;
      }

      // Adjust vertical position if near viewport edges
      if (top < 10) {
        top = rect.bottom + window.scrollY + 10; // Position below if not enough space above
      } else if (top + buttonHeight > viewportHeight - 10) {
        top = viewportHeight - buttonHeight - 10;
      }

      // Position the button near the selected text
      setPosition({
        top,
        left
      });

      setSelectedText(selectedText);
      setIsVisible(true);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };

    const handleScroll = () => {
      // Hide button when scrolling to prevent positioning issues
      setIsVisible(false);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleQuoteClick = () => {
    if (selectedText) {
      addQuote(selectedText, 'user-selection');
      setIsVisible(false);
    }
  };

  if (!isVisible || !position) return null;

  return (
  <button
    ref={buttonRef}
    onClick={handleQuoteClick}
    className={cn(
      "fixed z-50 w-10 h-10 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-md",
      "flex items-center justify-center text-[var(--text-accent)] hover:bg-[var(--text-accent)]",
      "hover:text-black transition-all duration-150 shadow-lg hover:shadow-xl",
      "focus:outline-none focus:ring-2 focus:ring-[var(--text-accent)] focus:ring-opacity-50",
      "transform hover:scale-105 active:scale-95 quote-button"
    )}
    style={{
      top: `${position.top}px`,
      left: `${position.left}px`,
      transition: 'all 150ms ease-out'
    }}
    aria-label="Quote selected text"
  >
    <QuoteIcon size={18} strokeWidth={2} />
  </button>
);
}