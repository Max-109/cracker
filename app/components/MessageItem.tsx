'use client';

import React, { memo } from 'react'; // Added memo
import { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { Copy, RefreshCw, ThumbsUp, ThumbsDown, Check, Plus, Minus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';

// Define plugins outside to avoid re-creation on every render
const REMARK_PLUGINS = [remarkMath, remarkGfm];
const REHYPE_PLUGINS = [rehypeKatex];

// Define components object with useMemo or outside (if static). 
// Since we use navigator.clipboard inside, it's safer to keep it inside but memoized, 
// or use a static definition and handle copy via event delegation or just keep it simple but memoized.
// Let's use a memoized component definition inside the component.

interface MessagePart {
  type: string;
  text?: string;
  reasoning?: string;
  [key: string]: unknown;
}

interface MessageItemProps {
  role: string;
  content: string | MessagePart[];
  isThinking?: boolean; // Helper to indicate if this is the active streaming message
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
    const [frame, setFrame] = useState(0);
    const frames = ['·', '✻', '✽', '✶', '✳', '✢'];

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame(prev => (prev + 1) % frames.length);
        }, 120); // Cycle speed
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={cn("flex items-center justify-center w-4 h-4 text-[var(--text-secondary)]", className)}>
            <span className="text-lg leading-none">{frames[frame]}</span>
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

export const MessageItem = memo(function MessageItem({ role, content, isThinking }: MessageItemProps) {
  const [isThinkingOpen, setIsThinkingOpen] = useState(!!isThinking); // Auto-open if currently thinking

  const [thinkingLabel, setThinkingLabel] = useState("Thinking");
  
  // Memoize markdown components to prevent full re-renders on every token update
  const markdownComponents = useMemo(() => ({
      code(props: any) {
          const { inline, className, children } = props;
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
              <div className="rounded-md overflow-hidden my-2">
                  <div className="flex items-center justify-between bg-[#2d2d2d] px-3 py-1.5 text-xs text-gray-400">
                      <span>{match[1]}</span>
                      <button 
                          onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                          className="hover:text-white transition-colors"
                      >
                          Copy
                      </button>
                  </div>
                  <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.875rem' }}
                      {...props}
                  >
                      {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
              </div>
          ) : (
              <code className={cn("bg-[var(--bg-hover)] px-1.5 py-0.5 rounded text-sm font-mono text-[var(--text-primary)]", className)} {...props}>
                  {children}
              </code>
          );
      },
      p: ({children}: any) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
      ul: ({children}: any) => <ul className="list-disc pl-4 mb-4 space-y-1">{children}</ul>,
      ol: ({children}: any) => <ol className="list-decimal pl-4 mb-4 space-y-1">{children}</ol>,
      li: ({children}: any) => <li className="mb-1">{children}</li>,
      h1: ({children}: any) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
      h2: ({children}: any) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
      h3: ({children}: any) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
      blockquote: ({children}: any) => <blockquote className="border-l-2 border-[var(--border-color)] pl-4 italic my-4 text-[var(--text-secondary)]">{children}</blockquote>,
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


  const handleCopy = () => {
    // Prefer final content, but fallback to thinking content if that's all we have? No, only copy final.
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
    const userText = typeof safeContent === 'string' ? safeContent : safeContent.map(p => p.text || '').join('');
    return (
      <div className="flex justify-end mb-6 group">
        <div className="max-w-[85%] sm:max-w-[70%] flex flex-col items-end">
           <div className="bg-[var(--bubble-user)] text-[var(--text-primary)] px-5 py-2.5 rounded-3xl leading-relaxed whitespace-pre-wrap relative">
             {userText}
           </div>
           {/* User Copy/Edit actions (simplified) */}
           <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2 select-none">
              <button 
                onClick={() => {
                   navigator.clipboard.writeText(userText).then(() => {
                      setUserCopied(true);
                      setTimeout(() => setUserCopied(false), 2000);
                   });
                }}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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

  // Handle multipart messages (new AI SDK format)
  if (typeof safeContent !== 'string' && Array.isArray(safeContent)) {
    safeContent.forEach((part: MessagePart) => {
        if (part.type === 'reasoning') {
            // Check both 'reasoning' (Vercel AI SDK standard for ReasoningPart) and 'text' (fallback)
            thinkContent += (part.reasoning || part.text || '');
        } else if (part.type === 'text') {
            finalContent += (part.text || '');
        }
    });
  } else if (typeof safeContent === 'string') {
    finalContent = safeContent;
  }

  // Parse <think> tags from text content if reasoning wasn't already found
  // This handles models that output reasoning as part of the text stream
  if (!thinkContent) {
    const thinkStart = finalContent.indexOf('<think>');
    if (thinkStart !== -1) {
        const thinkEnd = finalContent.indexOf('</think>');
        if (thinkEnd !== -1) {
            thinkContent = finalContent.substring(thinkStart + 7, thinkEnd).trim();
            finalContent = (finalContent.substring(0, thinkStart) + finalContent.substring(thinkEnd + 8)).trim();
        } else {
            // Streaming case: open tag but no close tag
            thinkContent = finalContent.substring(thinkStart + 7).trim();
            finalContent = finalContent.substring(0, thinkStart).trim();
        }
    }
  }

  const hasThinking = !!thinkContent || isThinking;
  const isThinkingValues = isThinking && !finalContent; // Assuming reasoning comes before content

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
                   {/* Show Spinner when thinking, otherwise Toggle Icon */}
                   {isThinking ? (
                       <ThinkingIcon />
                   ) : (
                       <ToggleIcon isOpen={isThinkingOpen} />
                   )}
                   
                   <span className={isThinking ? "animate-pulse-dot font-semibold tracking-wide text-[var(--text-secondary)]" : "font-medium"}>{thinkingLabel}</span>
                   
                   {/* Show 'Thinking...' if streaming and closed */}
                   {isThinking && !isThinkingOpen && (
                     <span className="text-[var(--text-secondary)] ml-1 opacity-60">...</span>
                   )}
                </button>
                
                {isThinkingOpen && (
                  <div className="mt-2 pl-3 border-l-2 border-[var(--border-color)] text-[var(--text-secondary)] text-sm whitespace-pre-wrap animate-in fade-in slide-in-from-top-1 duration-300">
                     <div className="prose dark:prose-invert max-w-none text-sm text-[var(--text-secondary)]">
                         <ReactMarkdown 
                            remarkPlugins={REMARK_PLUGINS} 
                            rehypePlugins={REHYPE_PLUGINS}
                         >
                            {thinkContent}
                         </ReactMarkdown>
                     </div>
                     {/* Cursor if still thinking */}
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
                
                {/* Cursor if streaming final content */}
                {isThinking && finalContent && <span className="animate-pulse ml-1 inline-block w-2 h-4 bg-[var(--text-primary)] align-middle"></span>}
             </div>
          ) : (
             // Show "Thinking..." only if we are waiting for start or in thinking mode but not showing details
             // AND we don't have a thinking block that is already showing "Thinking..."
             (isThinking && !hasThinking) ? (
               <div className="flex items-center gap-2 text-[var(--text-secondary)] animate-pulse">
                  <span className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-sm ml-1">Thinking...</span>
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
