'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Quote {
  id: string;
  text: string;
  source: string;
}

interface QuoteContextType {
  quotes: Quote[];
  addQuote: (text: string, source: string) => void;
  removeQuote: (id: string) => void;
  clearQuotes: () => void;
  getQuotedText: () => string;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const addQuote = useCallback((text: string, source: string) => {
    const id = Date.now().toString();
    setQuotes(prevQuotes => [...prevQuotes, { id, text, source }]);
  }, []);

  const removeQuote = useCallback((id: string) => {
    setQuotes(prevQuotes => prevQuotes.filter(quote => quote.id !== id));
  }, []);

  const clearQuotes = useCallback(() => {
    setQuotes([]);
  }, []);

  const getQuotedText = useCallback(() => {
    return quotes.map(quote => `> ${quote.text}`).join('\n\n');
  }, [quotes]);

  return (
    <QuoteContext.Provider value={{ quotes, addQuote, removeQuote, clearQuotes, getQuotedText }}>
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuoteContext() {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error('useQuoteContext must be used within a QuoteProvider');
  }
  return context;
}