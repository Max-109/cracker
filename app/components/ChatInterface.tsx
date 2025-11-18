'use client';

import { useChat } from 'ai/react';
import { Sidebar } from './Sidebar';
import { MessageItem } from './MessageItem';
import { ArrowUp, Paperclip, Globe, ChevronDown, PanelLeft, Copy, ThumbsUp, ThumbsDown, Square } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, setMessages } = useChat({
     api: '/api/chat',
     initialMessages: [],
  });

  const handleNewChat = () => {
    setMessages([]);
    stop();
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        handleSubmit(e as any);
      }
    }
  };

  return (
    <div className="flex h-full w-full bg-[var(--bg-main)] text-[var(--text-primary)] overflow-hidden">
      <Sidebar onNewChat={handleNewChat} />
      
      <main className="flex-1 flex flex-col relative h-full">
         {/* Top Bar */}
         <div className="absolute top-0 left-0 w-full h-14 flex items-center justify-between px-4 z-10">
            <div className="flex items-center gap-2 md:hidden">
               <button className="p-2 hover:bg-[var(--bg-hover)] rounded-md text-[var(--text-secondary)]">
                  <PanelLeft size={20} />
               </button>
            </div>
            <button className="flex items-center gap-1 text-lg font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] px-3 py-2 rounded-lg transition-colors ml-auto md:ml-0 md:mr-auto">
               <span>ChatGPT 4o</span>
               <ChevronDown size={16} className="text-[var(--text-secondary)]" />
            </button>
         </div>

        <div className="flex-1 overflow-y-auto scroll-smooth">
           <div className="max-w-[800px] mx-auto pt-20 pb-40 px-4 md:px-6">
              {messages.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-100">
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Where should we begin?</h2>
                 </div>
              )}
              
              {messages.map((m, index) => (
                 <MessageItem 
                    key={m.id} 
                    role={m.role} 
                    content={m.content} 
                    isThinking={isLoading && index === messages.length - 1 && m.role === 'assistant'}
                 />
              ))}
              
              {/* Explicit generic Thinking indicator if loading but no assistant message yet */}
              {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                 <div className="flex justify-start mb-6 w-full animate-pulse">
                    <div className="w-0 h-0 flex-shrink-0 overflow-hidden"></div>
                    <div className="flex items-center text-[var(--text-secondary)] text-sm ml-4">Thinking...</div>
                 </div>
              )}
           </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)] to-transparent pt-10 pb-6">
           <div className="max-w-[800px] mx-auto px-4">
              <div className="relative bg-[var(--bg-input)] rounded-[26px] flex flex-col border border-[var(--border-color)] shadow-sm focus-within:border-[#676767] transition-colors">
                 <textarea 
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Chai"
                    className="w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] pl-16 pr-12 py-3.5 resize-none focus:outline-none max-h-[200px] min-h-[52px] leading-relaxed scrollbar-hide"
                    rows={1}
                 />
                 {/* Left Icons: Attach */}
                 <div className="absolute bottom-3 left-3 flex items-center h-[32px]">
                    <button className="text-[#b4b4b4] hover:text-white transition-colors p-1 rounded-full">
                       <div className="w-9 h-9 rounded-full border border-[#676767] flex items-center justify-center">
                           <Paperclip size={20} strokeWidth={2} />
                       </div>
                    </button>
                 </div>

                 {/* Right Icons: Send / Stop */}
                 <div className="absolute bottom-3 right-3 flex items-center h-[32px]">
                     {isLoading ? (
                        <button 
                           onClick={() => stop()}
                           className="p-2 rounded-full bg-white text-black hover:opacity-90 transition-all duration-200 flex items-center justify-center"
                        >
                           <Square size={16} fill="currentColor" />
                        </button>
                     ) : (
                        <button 
                           onClick={(e) => input.trim() && handleSubmit(e as any)}
                           disabled={!input.trim()}
                           className={cn(
                              "p-2 rounded-full transition-all duration-200 flex items-center justify-center",
                              input.trim() 
                                 ? "bg-white text-black hover:opacity-90" 
                                 : "bg-[#676767] text-[#2F2F2F] cursor-default opacity-50"
                           )}
                        >
                           <ArrowUp size={20} strokeWidth={3} />
                        </button>
                     )}
                 </div>
              </div>
              <div className="text-center text-xs text-[var(--text-secondary)] mt-3">
                 ChatGPT can make mistakes. Check important info.
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
