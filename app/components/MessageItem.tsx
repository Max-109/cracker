'use client';

import React, { memo } from 'react'; // Added memo
import { useState, useEffect, useMemo, useRef } from 'react'; // Added useMemo, useRef
import { Copy, RefreshCw, Check, Plus, Minus, Pencil, File as FileIcon } from 'lucide-react';
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
  data?: string; // For generic files
  mimeType?: string;
  reasoning?: string;
  [key: string]: unknown;
}

interface MessageItemProps {
  role: string;
  content: string | MessagePart[];
  isThinking?: boolean;
  onEdit?: (newContent: string) => void;
  onRetry?: () => void;
}

const THINKING_LABELS = [
  "Compiling",
  "Processing",
  "Linking",
  "Calibrating",
  "Simulating",
  "Analyzing",
  "Routing"
];

// Animated "Thinking" Icon - ASCII Spinner
function ThinkingIcon({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center w-4 h-4 text-[var(--text-secondary)]", className)}>
      <div className="flex space-x-[2px]">
        <div className="w-1 h-1 bg-[var(--text-secondary)] animate-[bounce_1s_infinite_0ms]"></div>
        <div className="w-1 h-1 bg-[var(--text-secondary)] animate-[bounce_1s_infinite_200ms]"></div>
        <div className="w-1 h-1 bg-[var(--text-secondary)] animate-[bounce_1s_infinite_400ms]"></div>
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

// Helper to format MIME types
const formatMimeType = (mime: string) => {
  if (!mime) return 'FILE';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('image/')) return mime.split('/')[1].toUpperCase();
  if (mime.includes('text/')) return 'TXT';
  if (mime.includes('word')) return 'DOC';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'XLS';
  return mime.split('/')[1]?.toUpperCase() || 'FILE';
};

export const MessageItem = memo(function MessageItem({ role, content, isThinking, onEdit, onRetry }: MessageItemProps) {
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
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
        <code className={cn("bg-[var(--bg-code)] border border-[var(--border-color)] px-1.5 py-[2px] text-sm font-mono text-[var(--text-accent)]", className)} {...props}>
          {children}
        </code>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p: ({ children }: any) => <div className="mb-3 last:mb-0 leading-relaxed text-[#E5E5E5]">{children}</div>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ul: ({ children }: any) => <ul className="list-disc pl-4 mb-4 space-y-1 text-[#E5E5E5]">{children}</ul>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-4 space-y-1 text-[#E5E5E5]">{children}</ol>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    li: ({ children }: any) => <li className="mb-1">{children}</li>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-3 mt-6 text-[#E5E5E5] tracking-tight">{children}</h1>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h2: ({ children }: any) => <h2 className="text-xl font-bold mb-3 mt-5 text-[#E5E5E5] tracking-tight">{children}</h2>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h3: ({ children }: any) => <h3 className="text-lg font-bold mb-2 mt-4 text-[#E5E5E5] tracking-tight">{children}</h3>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-[var(--text-accent)]/70 pl-4 py-2 bg-[#050505] my-4 text-[var(--text-secondary)]">{children}</blockquote>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table: ({ children }: any) => (
      <div className="my-4 w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#2f2f2f] scrollbar-track-transparent border border-[var(--border-color)] bg-[#050505]">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thead: ({ children }: any) => <thead className="bg-[#0f0f0f] text-left text-[var(--text-secondary)]">{children}</thead>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tbody: ({ children }: any) => <tbody className="divide-y divide-[var(--border-color)] bg-transparent">{children}</tbody>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tr: ({ children }: any) => <tr className="transition-colors hover:bg-[#0a0a0a]">{children}</tr>,
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
        } else if (part.type === 'file' && part.data) {
          // Treat files as images if they are images (fallback), otherwise store for file rendering
          // Actually, let's separate files from images for rendering
          // For now, we'll add a separate array for files
        }
      });
    }

    // Separate extraction for files to keep logic clean
    const userFiles: { data: string; mimeType: string; name?: string }[] = [];
    if (Array.isArray(safeContent)) {
      safeContent.forEach(part => {
        if (part.type === 'file' && part.data) {
          // Extract name if available
          const fileName = part.name || 'File Attachment';
          userFiles.push({ data: part.data, mimeType: part.mimeType || 'application/octet-stream', name: fileName as string });
        }
      });
    }

    if (isEditing) {
      return (
        <div className="w-full mb-6 flex justify-end">
          <div className="w-full max-w-[80%]">
            <div className="flex items-start gap-3 flex-row-reverse">
              <span className="text-[var(--text-accent)] font-semibold text-lg leading-none mt-[2px] sr-only">{'>'}</span>
              <div className="flex-1 space-y-3">
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-[#050505] border border-[var(--border-active)] text-[var(--text-primary)] resize-none focus:outline-none p-3 min-h-[96px]"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--border-active)]"
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
                    className="px-3 py-1.5 text-xs uppercase tracking-[0.12em] bg-[var(--text-accent)] text-black border border-[var(--text-accent)] hover:bg-black hover:text-[var(--text-accent)]"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full mb-6 group flex justify-end">
        <div className="w-full max-w-[80%]">
          <div className="flex items-start gap-3 flex-row-reverse">
            <span className="text-[var(--text-accent)] font-semibold text-lg leading-none mt-[2px] sr-only">{'>'}</span>
            <div className="flex-1 space-y-3 flex flex-col items-end">
              {/* Render Images if any */}
              {userImages.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end">
                  {userImages.map((img, idx) => (
                    <div key={idx} className="relative border border-[var(--border-color)] bg-[#050505] overflow-hidden">
                      <img src={img} alt={`Attachment ${idx + 1}`} className="max-w-[200px] max-h-[200px] object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Render Files if any */}
              {userFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end">
                  {userFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-[#0a0a0a] border border-[var(--border-color)] px-3 py-2 min-w-[220px]">
                      <div className="w-10 h-10 bg-[#050505] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
                        <FileIcon className="text-[var(--text-secondary)]" size={18} />
                      </div>
                      <div className="flex flex-col overflow-hidden text-right">
                        <span className="text-sm font-medium text-[var(--text-primary)] truncate">{file.name}</span>
                        <span className="text-xs text-[var(--text-secondary)] truncate">{formatMimeType(file.mimeType)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Render Text if there is text */}
              {userText && (
                <div className="bg-[#1a1a1a] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed break-words px-4 py-2.5 rounded-2xl rounded-tr-sm border border-[var(--border-color)]">
                  {userText}
                </div>
              )}

              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-opacity select-none justify-end w-full">
                <button
                  onClick={() => {
                    setEditContent(userText);
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1 hover:text-[var(--text-accent)]"
                  aria-label="Edit"
                >
                  <Pencil size={14} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(userText).then(() => {
                      setUserCopied(true);
                      setTimeout(() => setUserCopied(false), 2000);
                    });
                  }}
                  className="flex items-center gap-1 hover:text-[var(--text-accent)]"
                  aria-label="Copy"
                >
                  {userCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>Copy</span>
                </button>
              </div>
            </div>
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

  return (
    <div className="w-full mb-6 group">
      <div className="flex items-start gap-3">
        <span className="text-[var(--text-secondary)] text-[11px] uppercase tracking-[0.18em] leading-none pt-[2px]">[AI]:</span>

        <div className="flex-1 text-[#E5E5E5] leading-relaxed space-y-3 overflow-hidden max-w-full">
          {/* Thinking Accordion */}
          {hasThinking && (
            <div className="border border-[var(--border-color)] bg-[#050505] p-3">
              <button
                onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors"
              >
                {isThinking ? <ThinkingIcon /> : <ToggleIcon isOpen={isThinkingOpen} />}
                <span className="font-semibold">{thinkingLabel}</span>
              </button>

              {isThinkingOpen && (
                <div className="mt-2 text-[var(--text-secondary)] text-sm whitespace-pre-wrap">
                  <div className="prose dark:prose-invert max-w-none text-sm text-[var(--text-secondary)]">
                    <ReactMarkdown
                      remarkPlugins={REMARK_PLUGINS}
                      rehypePlugins={REHYPE_PLUGINS}
                      components={markdownComponents}
                    >
                      {thinkContent}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Final Content */}
          {finalContent ? (
            <div className="min-h-[20px] space-y-3">
              <div className="prose dark:prose-invert max-w-none break-words prose-pre:bg-transparent prose-pre:p-0">
                <ReactMarkdown
                  remarkPlugins={REMARK_PLUGINS}
                  rehypePlugins={REHYPE_PLUGINS}
                  components={markdownComponents}
                >
                  {finalContent}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            (isThinking && !hasThinking) ? (
              <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                <ThinkingIcon />
              </div>
            ) : null
          )}

          {/* Action Buttons (Copy, Regenerate) */}
          {!isThinking && finalContent && (
            <div className="flex items-center gap-3 mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-opacity select-none">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 hover:text-[var(--text-accent)]"
                aria-label="Copy"
              >
                {isCopied ? <Check size={14} /> : <Copy size={14} />}
                <span>Copy</span>
              </button>
              <button 
                onClick={onRetry}
                className="flex items-center gap-1 hover:text-[var(--text-accent)]" 
                aria-label="Regenerate"
              >
                <RefreshCw size={14} />
                <span>Re-run</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
