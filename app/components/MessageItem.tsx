'use client';

import React, { memo } from 'react'; // Added memo
import { useState, useEffect, useMemo, useRef } from 'react'; // Added useMemo, useRef
import { Copy, RefreshCw, ThumbsUp, ThumbsDown, Check, Plus, Minus, Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { CodeBlock } from './CodeBlock';
import { LoadingIndicator } from './LoadingIndicator';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';
const REMARK_PLUGINS = [remarkMath, remarkGfm];
const REHYPE_PLUGINS = [rehypeKatex];

interface MessagePart {
  type: string;
  text?: string;
  image?: string; // Added image property
  reasoning?: string;
  [key: string]: unknown;
}

interface MessageItemProps {
  role: string;
  content: string | MessagePart[];
  isThinking?: boolean;
  onEdit?: (newContent: string) => void;
}

const THINKING_LABELS = [
  "Thinking",
  "Reasoning",
  "Simmering",
  "Pondering",
  "Analyzing",
  "Processing",
  "Deliberating"
];

// Animated "Thinking" Icon - ASCII Spinner
function ThinkingIcon({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center w-4 h-4 text-[var(--text-secondary)]", className)}>
      <div className="flex space-x-[2px]">
        <div className="w-1 h-1 bg-[var(--text-secondary)] rounded-full animate-[bounce_1s_infinite_0ms]"></div>
        <div className="w-1 h-1 bg-[var(--text-secondary)] rounded-full animate-[bounce_1s_infinite_200ms]"></div>
        <div className="w-1 h-1 bg-[var(--text-secondary)] rounded-full animate-[bounce_1s_infinite_400ms]"></div>
      </div>
    </div>
  );
}

// Custom collapsed/expanded indicator (Simple Plus/Minus)
function ToggleIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="flex items-center justify-center text-[var(--text-secondary)]">
      {isOpen ? <Minus size={14} /> : <Plus size={14} />}
    </div>
  );
}

// Utility to preprocess LaTeX for better compatibility with remark-math
const preprocessLaTeX = (content: string) => {
  // 1. Replace \[ ... \] with $$ ... $$ (Block Math)
  let processed = content.replace(/\\\[([\s\S]*?)\\\]/g, '\n$$$1$$\n');

  // 2. Replace \( ... \) with $ ... $ (Inline Math)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  return processed;
};

export const MessageItem = memo(function MessageItem({ role, content, isThinking, onEdit }: MessageItemProps) {
  const [isThinkingOpen, setIsThinkingOpen] = useState(!!isThinking);
  const [thinkingLabel, setThinkingLabel] = useState("Thinking");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Memoize markdown components
  const markdownComponents = useMemo(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code(props: any) {
      const { inline, className, children } = props;
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <CodeBlock
          language={match[1]}
          value={String(children).replace(/\n$/, '')}
          className="my-4"
        />
      ) : (
        <code className={cn("bg-[var(--bg-hover)] px-1.5 py-0.5 rounded text-sm font-mono text-[var(--text-primary)]", className)} {...props}>
          {children}
        </code>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p: ({ children }: any) => <div className="mb-4 last:mb-0 leading-relaxed">{children}</div>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ul: ({ children }: any) => <ul className="list-disc pl-4 mb-4 space-y-1">{children}</ul>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-4 space-y-1">{children}</ol>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    li: ({ children }: any) => <li className="mb-1">{children}</li>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h2: ({ children }: any) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h3: ({ children }: any) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-[var(--border-color)] pl-4 italic my-4 text-[var(--text-secondary)]">{children}</blockquote>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table: ({ children }: any) => (
      <div className="my-4 w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#424242] scrollbar-track-transparent rounded-lg border border-[var(--border-color)]">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thead: ({ children }: any) => <thead className="bg-[var(--bg-input)] text-left text-[var(--text-secondary)]">{children}</thead>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tbody: ({ children }: any) => <tbody className="divide-y divide-[var(--border-color)] bg-transparent">{children}</tbody>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tr: ({ children }: any) => <tr className="transition-colors hover:bg-[var(--bg-hover)]/50">{children}</tr>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    th: ({ children }: any) => <th className="px-4 py-3 font-medium">{children}</th>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    td: ({ children }: any) => <td className="px-4 py-3 align-top">{children}</td>,
  }), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThinkingLabel(THINKING_LABELS[Math.floor(Math.random() * THINKING_LABELS.length)]);
  }, []);

  useEffect(() => {
    if (isThinking) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsThinkingOpen(true);
    }
  }, [isThinking]);

  // Auto-resize edit textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editContent, isEditing]);


  const handleCopy = () => {
    if (!finalContent) return;
    navigator.clipboard.writeText(finalContent).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const [isCopied, setIsCopied] = useState(false);
  const [userCopied, setUserCopied] = useState(false);

  const safeContent = content || '';

  if (role === 'user') {
    let userText = '';
    let userImages: string[] = [];

    if (typeof safeContent === 'string') {
      userText = safeContent;
    } else if (Array.isArray(safeContent)) {
      safeContent.forEach(part => {
        if (part.type === 'text' && part.text) {
          userText += part.text;
        } else if (part.type === 'image' && part.image) {
          userImages.push(part.image);
        }
      });
    }

    if (isEditing) {
      return (
        <div className="flex justify-end mb-6 w-full">
          <div className="max-w-[85%] sm:max-w-[70%] w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl p-4">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-transparent text-[var(--text-primary)] resize-none focus:outline-none scrollbar-hide"
              rows={1}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-sm rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editContent.trim() !== userText) {
                    onEdit?.(editContent);
                  }
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 text-sm rounded-lg bg-[#fff] text-black hover:opacity-90 font-medium transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-end mb-6 group">
        <div className="max-w-[85%] sm:max-w-[70%] flex flex-col items-end">
          {/* Render Images if any */}
          {userImages.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2 mb-2">
              {userImages.map((img, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden border border-[var(--border-color)]">
                  <img src={img} alt={`Attachment ${idx + 1}`} className="max-w-[200px] max-h-[200px] object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Render Text Bubble if there is text */}
          {userText && (
            <div className="bg-[var(--bubble-user)] text-[var(--text-primary)] px-5 py-2.5 rounded-3xl leading-relaxed whitespace-pre-wrap break-all relative">
              {userText}
            </div>
          )}

          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2 select-none">
            <button
              onClick={() => {
                setEditContent(userText);
                setIsEditing(true);
              }}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Edit"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(userText).then(() => {
                  setUserCopied(true);
                  setTimeout(() => setUserCopied(false), 2000);
                });
              }}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Copy"
            >
              {userCopied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Assistant Logic
  let thinkContent = '';
  let finalContent = '';

  if (typeof safeContent !== 'string' && Array.isArray(safeContent)) {
    safeContent.forEach((part: MessagePart) => {
      if (part.type === 'reasoning') {
        thinkContent += (part.reasoning || part.text || '');
      } else if (part.type === 'text') {
        finalContent += (part.text || '');
      }
    });
  } else if (typeof safeContent === 'string') {
    finalContent = safeContent;
  }

  if (!thinkContent) {
    const thinkStart = finalContent.indexOf('<think>');
    if (thinkStart !== -1) {
      const thinkEnd = finalContent.indexOf('</think>');
      if (thinkEnd !== -1) {
        thinkContent = finalContent.substring(thinkStart + 7, thinkEnd).trim();
        finalContent = (finalContent.substring(0, thinkStart) + finalContent.substring(thinkEnd + 8)).trim();
      } else {
        thinkContent = finalContent.substring(thinkStart + 7).trim();
        finalContent = finalContent.substring(0, thinkStart).trim();
      }
    }
  }

  finalContent = preprocessLaTeX(finalContent);
  thinkContent = preprocessLaTeX(thinkContent);

  const hasThinking = (!!thinkContent || isThinking) && thinkContent.length > 0;
  const isThinkingValues = isThinking && !finalContent;

  return (
    <div className="flex justify-start mb-6 w-full group">
      <div className="w-0 h-0 flex-shrink-0 overflow-hidden"></div>

      <div className="flex-1 text-[var(--text-primary)] leading-relaxed space-y-1 overflow-hidden max-w-full">
        {/* Thinking Accordion */}
        {hasThinking && (
          <div className="mb-3">
            <button
              onClick={() => setIsThinkingOpen(!isThinkingOpen)}
              className="flex items-center gap-3 text-xs font-medium text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity select-none group/thinking"
            >
              {isThinking ? <ThinkingIcon /> : <ToggleIcon isOpen={isThinkingOpen} />}

              <span className={isThinking ? "animate-pulse-dot font-semibold tracking-wide text-[var(--text-secondary)] animate-[pulse_2s_ease-in-out_infinite]" : "font-medium"}>{thinkingLabel}</span>

              {isThinking && !isThinkingOpen && (
                <span className="text-[var(--text-secondary)] ml-1 opacity-60 animate-[pulse_2s_ease-in-out_infinite]">...</span>
              )}
            </button>

            {isThinkingOpen && (
              <div className="mt-2 pl-3 border-l-2 border-[var(--border-color)] text-[var(--text-secondary)] text-sm whitespace-pre-wrap animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="prose dark:prose-invert max-w-none text-sm text-[var(--text-secondary)]">
                  <ReactMarkdown
                    remarkPlugins={REMARK_PLUGINS}
                    rehypePlugins={REHYPE_PLUGINS}
                    components={markdownComponents}
                  >
                    {thinkContent}
                  </ReactMarkdown>
                </div>
                {isThinkingValues && <span className="animate-pulse ml-1 inline-block w-1.5 h-3.5 bg-[var(--text-secondary)] align-middle"></span>}
              </div>
            )}
          </div>
        )}

        {/* Final Content */}
        {finalContent ? (
          <div className="min-h-[20px]">
            <div className="prose dark:prose-invert max-w-none break-words">
              <ReactMarkdown
                remarkPlugins={REMARK_PLUGINS}
                rehypePlugins={REHYPE_PLUGINS}
                components={markdownComponents}
              >
                {finalContent}
              </ReactMarkdown>
            </div>
            {isThinking && finalContent && <span className="animate-pulse ml-1 inline-block w-2 h-4 bg-[var(--text-primary)] align-middle"></span>}
          </div>
        ) : (
          (isThinking && !hasThinking) ? (
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <LoadingIndicator />
            </div>
          ) : null
        )}

        {/* Action Buttons (Copy, Regenerate) */}
        {!isThinking && finalContent && (
          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity select-none">
            <button
              onClick={handleCopy}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
              aria-label="Copy"
            >
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-hover)] transition-colors" aria-label="Regenerate">
              <RefreshCw size={16} />
            </button>
            <button className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-hover)] transition-colors" aria-label="Good response">
              <ThumbsUp size={16} />
            </button>
            <button className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-hover)] transition-colors" aria-label="Bad response">
              <ThumbsDown size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
