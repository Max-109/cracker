'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Bot, Copy, RefreshCw, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageItemProps {
  role: string;
  content: string;
  isThinking?: boolean; // Helper to indicate if this is the active streaming message
}

export function MessageItem({ role, content, isThinking }: MessageItemProps) {
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);

  useEffect(() => {
    if (role === 'assistant' && isThinking) {
      console.log('Assistant content:', content);
    }
  }, [content, role, isThinking]);


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

  if (role === 'user') {
    return (
      <div className="flex justify-end mb-6 group">
        <div className="max-w-[85%] sm:max-w-[70%] flex flex-col items-end">
           <div className="bg-[var(--bubble-user)] text-[var(--text-primary)] px-5 py-2.5 rounded-3xl leading-relaxed whitespace-pre-wrap relative">
             {content}
           </div>
           {/* User Copy/Edit actions (simplified) */}
           <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2 select-none">
              <button 
                onClick={() => {
                   navigator.clipboard.writeText(content).then(() => {
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
  let finalContent = content;
  
  // Check for <think> tags
  const thinkStart = content.indexOf('<think>');
  if (thinkStart !== -1) {
    const thinkEnd = content.indexOf('</think>');
    if (thinkEnd !== -1) {
       // Complete thinking block
       thinkContent = content.substring(thinkStart + 7, thinkEnd).trim();
       finalContent = (content.substring(0, thinkStart) + content.substring(thinkEnd + 8)).trim();
    } else {
       // Incomplete thinking block (streaming)
       thinkContent = content.substring(thinkStart + 7).trim();
       finalContent = content.substring(0, thinkStart).trim(); // Content before think (usually empty)
    }
  }

  const hasThinking = !!thinkContent;
  // If we have thinking content but no final content yet, and we are effectively "done" thinking (tag closed) but haven't streamed response, finalContent is empty.
  // If tag is open, we are still thinking.

  return (
    <div className="flex justify-start mb-6 w-full group">
       <div className="w-0 h-0 flex-shrink-0 overflow-hidden"></div>
       
       <div className="flex-1 text-[var(--text-primary)] leading-relaxed space-y-1 overflow-hidden max-w-full">
          {/* Thinking Accordion */}
          {hasThinking && (
             <div className="mb-3">
                <button 
                  onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                  className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity select-none"
                >
                   {isThinkingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                   <span>Reasoning Process</span>
                   {/* Show 'Thinking...' if streaming and closed */}
                   {isThinking && !isThinkingOpen && (
                     <span className="animate-pulse text-[var(--text-secondary)] ml-1">Thinking...</span>
                   )}
                </button>
                
                {isThinkingOpen && (
                  <div className="mt-2 pl-3 border-l-2 border-[var(--border-color)] text-[var(--text-secondary)] text-sm whitespace-pre-wrap animate-in fade-in duration-300">
                     {thinkContent}
                     {/* Cursor if still thinking and tag not closed */}
                     {isThinking && content.indexOf('</think>') === -1 && <span className="animate-pulse ml-1">▍</span>}
                  </div>
                )}
             </div>
          )}

          {/* Final Content */}
          {finalContent ? (
             <div className="whitespace-pre-wrap min-h-[20px]">{finalContent}</div>
          ) : (
             // Show "Thinking..." only if we are waiting for start or in thinking mode but not showing details
             // AND we don't have a thinking block that is already showing "Thinking..."
             (isThinking && !hasThinking) ? (
               <div className="flex items-center gap-2 text-[var(--text-secondary)] animate-pulse">
                  <span className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce [animation-delay:0.4s]"></span>
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
}
