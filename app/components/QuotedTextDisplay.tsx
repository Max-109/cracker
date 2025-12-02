'use client';

import { useQuoteContext } from './QuoteContext';
import { X, Quote as QuoteIcon, MessageSquareQuote } from 'lucide-react';

interface QuotedTextDisplayProps {
  onClearQuotes?: () => void;
}

export function QuotedTextDisplay({ onClearQuotes }: QuotedTextDisplayProps) {
  const { quotes, removeQuote } = useQuoteContext();

  if (quotes.length === 0) return null;

  return (
    <div className="border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/5 p-3 mb-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquareQuote size={14} className="text-[var(--text-accent)]" />
          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--text-accent)]">
            Asking about quoted text
          </span>
          <span className="text-[9px] text-[var(--text-accent)] opacity-70">({quotes.length})</span>
        </div>

        <button
          onClick={onClearQuotes}
          className="text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors duration-150 text-[10px] uppercase tracking-wider"
        >
          Clear
        </button>
      </div>

      {/* Quotes List */}
      <div className="space-y-2 max-h-[120px] overflow-y-auto scrollbar-custom">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="flex items-start gap-2 p-2 border-l-2 border-l-[var(--text-accent)] bg-[#1a1a1a] pl-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-[var(--text-primary)] break-words italic">
                &ldquo;{quote.text}&rdquo;
              </div>
            </div>

            <button
              onClick={() => removeQuote(quote.id)}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors duration-150"
              aria-label="Remove quote"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div className="mt-2 text-[9px] text-[var(--text-secondary)]">
        Type your question below - AI will know you&apos;re asking about this quote
      </div>
    </div>
  );
}