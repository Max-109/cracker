'use client';

import React, { memo } from 'react';
import { useChat } from '@ai-sdk/react';
import { MessageItem } from './MessageItem';
import { Skeleton } from './Skeleton';
import { ArrowUp, Paperclip, ChevronDown, PanelLeft, Square, Check, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useChatContext } from './ChatContext';

// Simple Custom Components for Dialog/Input (since we can't easily install shadcn via cli)
// In a real scenario, we would use proper Radix/Shadcn components.

function CustomDialog({ isOpen, onClose, onSubmit, initialValue }: { isOpen: boolean; onClose: () => void; onSubmit: (val: string) => void; initialValue: string }) {
  const [val, setVal] = useState(initialValue);
  
  // Animation logic for mounting/unmounting
  const [shouldRender, setShouldRender] = useState(isOpen);
  
  useEffect(() => {
      if (isOpen) setShouldRender(true);
  }, [isOpen]);

  const onAnimationEnd = () => {
      if (!isOpen) setShouldRender(false);
  };

  if (!shouldRender) return null;

  return (
    <div 
        className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200",
            isOpen ? "opacity-100" : "opacity-0"
        )}
        onTransitionEnd={onAnimationEnd}
    >
       <div className={cn(
           "bg-[var(--bg-sidebar)] border border-[var(--border-color)] p-6 rounded-xl w-[90%] max-w-md shadow-2xl transition-all duration-200 transform",
           isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
       )}>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Set Custom Model ID</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">Enter the full OpenRouter model ID (e.g., openai/gpt-oss-120b:exacto).</p>
          <input 
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[#676767] mb-6"
            placeholder="openai/gpt-oss-120b:exacto"
            autoFocus
          />
          <div className="flex justify-end gap-2">
             <button onClick={onClose} className="px-4 py-2 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">Cancel</button>
             <button onClick={() => onSubmit(val)} className="px-4 py-2 rounded-lg bg-white text-black hover:opacity-90 font-medium transition-colors">Save</button>
          </div>
       </div>
    </div>
  );
}

// Smooth Fade Wrapper for Skeletons/Content
function FadeWrapper({ show, children, className }: { show: boolean; children: React.ReactNode; className?: string }) {
    const [shouldRender, setShouldRender] = useState(show);
    const [isFadingIn, setIsFadingIn] = useState(false);

    useEffect(() => {
        if (show) {
            setShouldRender(true);
            // Small delay to allow render before transition
            requestAnimationFrame(() => setIsFadingIn(true));
        } else {
            setIsFadingIn(false);
            const timer = setTimeout(() => setShouldRender(false), 300); // Match duration
            return () => clearTimeout(timer);
        }
    }, [show]);

    if (!shouldRender) return null;

    return (
        <div className={cn("transition-opacity duration-300", isFadingIn ? "opacity-100" : "opacity-0", className)}>
            {children}
        </div>
    );
}

interface ChatInterfaceProps {
    initialChatId?: string;
}

const ThrottledMessageItem = memo(function ThrottledMessageItem({ message, isThinking }: { message: any, isThinking: boolean }) {
    // For user messages, render immediately
    if (message.role === 'user') {
        return <MessageItem role={message.role} content={message.content || message.parts} />;
    }

    // For AI messages, throttle updates to 100ms to prevent CPU spikes during fast streaming
    const [throttledContent, setThrottledContent] = useState(message.content || message.parts);
    const lastUpdateRef = useRef(Date.now());
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        // If it's the final content (not streaming anymore), update immediately
        if (!isThinking) {
            setThrottledContent(message.content || message.parts);
            return;
        }

        const now = Date.now();
        if (now - lastUpdateRef.current > 100) {
            setThrottledContent(message.content || message.parts);
            lastUpdateRef.current = now;
        } else {
            // Schedule an update if we haven't updated recently
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                setThrottledContent(message.content || message.parts);
                lastUpdateRef.current = Date.now();
            });
        }
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [message.content, message.parts, isThinking]);

    return <MessageItem role={message.role} content={throttledContent} isThinking={isThinking} />;
});

export default function ChatInterface({ initialChatId }: ChatInterfaceProps) {
  const router = useRouter();
  const { refreshChats, toggleSidebar } = useChatContext();
  
  // User Settings State with LocalStorage Persistence
  const [currentModelId, setCurrentModelId] = useState("openai/gpt-oss-120b:exacto");
  const [currentModelName, setCurrentModelName] = useState("GPT 5.1");
  const [reasoningEffort, setReasoningEffort] = useState("medium");

  // Load settings on mount
  useEffect(() => {
      const savedModelId = localStorage.getItem('CHATGPT_MODEL_ID');
      const savedModelName = localStorage.getItem('CHATGPT_MODEL_NAME');
      const savedEffort = localStorage.getItem('CHATGPT_REASONING_EFFORT');

      if (savedModelId) setCurrentModelId(savedModelId);
      if (savedModelName) setCurrentModelName(savedModelName);
      if (savedEffort) setReasoningEffort(savedEffort);
  }, []);

  // Save settings on change
  useEffect(() => {
      localStorage.setItem('CHATGPT_MODEL_ID', currentModelId);
      localStorage.setItem('CHATGPT_MODEL_NAME', currentModelName);
  }, [currentModelId, currentModelName]);

  useEffect(() => {
      localStorage.setItem('CHATGPT_REASONING_EFFORT', reasoningEffort);
  }, [reasoningEffort]);

  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [isEffortMenuOpen, setIsEffortMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [attachments, setAttachments] = useState<FileList | null>(null);
  
  const [currentChatId, setCurrentChatId] = useState<string | null>(initialChatId || null);
  const chatIdRef = useRef<string | null>(initialChatId || null);
  
  // Ref to track latest messages for persistence fallback
  const messagesRef = useRef<any[]>([]);
  
  // Loading states
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  
  // Ref to prevent double-loading messages when we just created a chat locally
  const ignoreNextChatIdChangeRef = useRef(false);

  // Sync state and ref when prop changes or internal navigation happens
  useEffect(() => {
      if (initialChatId) {
          setCurrentChatId(initialChatId);
          chatIdRef.current = initialChatId;
      }
  }, [initialChatId]);

  // Update ref whenever state changes
  useEffect(() => {
      chatIdRef.current = currentChatId;
  }, [currentChatId]);

  // Load messages when chat ID changes
  useEffect(() => {
      if (currentChatId) {
          // If we just created this chat locally, don't overwrite the optimistic state from useChat
          if (ignoreNextChatIdChangeRef.current) {
              ignoreNextChatIdChangeRef.current = false;
              return;
          }

          setIsMessagesLoading(true);
          fetch(`/api/chats/${currentChatId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Map DB messages to UI format
                    const uiMessages = data.map((msg: any) => {
                        const isParts = Array.isArray(msg.content);
                        return {
                            id: msg.id,
                            role: msg.role,
                            // If it's an array (parts), we put it in 'parts' and leave content empty/stringified.
                            // However, MessageItem uses (content || parts), so we need to ensure 'parts' is set if it's an array.
                            content: isParts ? "" : msg.content, 
                            parts: isParts ? msg.content : undefined,
                            createdAt: new Date(msg.createdAt)
                        };
                    });
                    setMessages(uiMessages);
                }
            })
            .catch(err => console.error("Failed to fetch messages:", err))
            .finally(() => setIsMessagesLoading(false));
      } else {
          setMessages([]);
          setIsMessagesLoading(false);
      }
  }, [currentChatId]);

  // Handle scroll events to determine if we should stick to bottom
  const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // If user is within 50px of bottom, enable auto-scroll. Otherwise disable it.
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShouldAutoScroll(isAtBottom);
  };

  // @ts-expect-error - useChat types mismatch
  const { messages, isLoading, stop, setMessages, sendMessage } = useChat({
     api: '/api/chat',
     body: {
        model: currentModelId,
        reasoningEffort: reasoningEffort
     },
     initialMessages: [],
     onError: (err: Error) => {
       console.error("Chat Error:", err);
     },
     onFinish: async (message: any) => {
       console.log("Chat finished:", message);
       // Use ref to ensure we have the latest ID even if closure is stale
       const activeId = chatIdRef.current;
       if (activeId) {
           // Determine the actual content to save. 
           // We prefer saving 'parts' (JSON) if available to preserve reasoning/structure.
           let contentToSave: any = null;

           // 1. Check if message.parts exists and is non-empty (Priority)
           if (message.parts && Array.isArray(message.parts) && message.parts.length > 0) {
               contentToSave = message.parts;
           }
           // 2. Check if message.content is already an object/array (from some providers)
           else if (message.content && typeof message.content !== 'string') {
               contentToSave = message.content;
           }
           // 3. Fallback to text content
           else if (message.content) {
               contentToSave = message.content;
           }

           // 4. Emergency Fallback: Check the React state if everything else is empty
           // (Common with some reasoning models that stream but don't populate the final object correctly)
           if (!contentToSave && messagesRef.current.length > 0) {
               const lastMsg = messagesRef.current[messagesRef.current.length - 1];
               if (lastMsg.role === 'assistant') {
                   console.log("Recovering content from state:", lastMsg);
                   if (lastMsg.parts && Array.isArray(lastMsg.parts) && lastMsg.parts.length > 0) {
                       contentToSave = lastMsg.parts;
                   } else if (lastMsg.content) {
                       contentToSave = lastMsg.content;
                   }
               }
           }

           // Final safety check
           if (!contentToSave) {
               console.warn("Content still empty after all checks. Saving placeholder.");
               contentToSave = " "; 
           }

           await fetch('/api/messages', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                   chatId: activeId,
                   role: 'assistant',
                   content: contentToSave // Can be string or JSON array
               })
           });
       } else {
           console.error("No active chat ID found in onFinish");
       }
     },
  } as unknown as import('@ai-sdk/react').UseChatOptions<any>);

  // Sync messages ref whenever messages update
  useEffect(() => {
      messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll effect (Moved after messages definition)
  useEffect(() => {
      if (shouldAutoScroll && messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
  }, [messages, shouldAutoScroll]);

  useEffect(() => {
    console.log("Current messages:", messages);
  }, [messages]);

  const [input, setInput] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setAttachments(e.target.files);
      }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && (!attachments || attachments.length === 0)) return;
    
    const userMessage = input;
    setInput(''); // Clear input immediately
    setAttachments(null); // Clear attachments
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      let activeChatId = currentChatId;
      let isNewChat = false;

      // Create chat if it doesn't exist
      if (!activeChatId) {
          const res = await fetch('/api/chats', { method: 'POST', body: JSON.stringify({ title: null }) });
          const newChat = await res.json();
          if (newChat && newChat.id) {
              activeChatId = newChat.id;
              
              // Prevent the subsequent useEffect from reloading messages and wiping our state
              ignoreNextChatIdChangeRef.current = true;
              
              setCurrentChatId(newChat.id);
              chatIdRef.current = newChat.id; // Immediately update ref
              isNewChat = true;
              refreshChats(); // Refresh sidebar
              
              // Navigate to the new chat URL
              // Use replace to avoid adding intermediate state if desirable, or push.
              window.history.pushState(null, '', `/chat/${newChat.id}`);
              // Or strictly using router (but that might trigger full reload/re-render):
              // router.push(`/chat/${newChat.id}`);
          }
      }

      // We aren't sending actual file content here because we don't have an upload endpoint.
      // We will just simulate it by appending text for now, or if we had experimental_attachments support.
      // Since we lack a backend upload handler, let's just append the filename to the prompt.
      let finalContent = userMessage;
      if (attachments && attachments.length > 0) {
          const fileNames = Array.from(attachments).map(f => `[File: ${f.name}]`).join(', ');
          finalContent = `${finalContent}\n\n${fileNames}`;
      }
      
      // Save User Message
      if (activeChatId) {
          await fetch('/api/messages', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                   chatId: activeChatId,
                   role: 'user',
                   content: finalContent
               })
           });
           
           // Generate Title if new chat
           if (isNewChat) {
               fetch('/api/generate-title', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ chatId: activeChatId, prompt: finalContent })
               }).then(() => refreshChats());
           }
      }

      await sendMessage({ role: 'user', content: finalContent }, {
          body: {
              model: currentModelId,
              reasoningEffort: reasoningEffort
          }
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleNewChat = () => {
    // This function is no longer used by sidebar, but keeping it just in case we need a local reset
    // Actually, we should probably remove it, but let's just leave it unused or use it if we had a "New Chat" button in main area
    setMessages([]);
    stop();
    setInput('');
    setCurrentChatId(null);
    chatIdRef.current = null;
    router.push('/');
  };
  
  const handleSelectChat = (id: string) => {
      if (id === currentChatId) return;
      setCurrentChatId(id);
      chatIdRef.current = id;
      router.push(`/chat/${id}`);
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
      handleSendMessage();
    }
  };

  const handleCustomModelSubmit = (val: string) => {
    if (!val.trim()) return;
    setCurrentModelId(val.trim());
    
    // Parse simple name: take part after slash, or part after last colon, or just full string
    let name = val.split('/').pop() || val;
    if (name.includes(':')) name = name.split(':')[0]; // remove version if desired, or keep it.
    // User said "gpt-oss-120b" from "openai/gpt-oss-120b:exacto" -> this logic:
    // 1. split by '/' -> "gpt-oss-120b:exacto"
    // 2. split by ':' -> "gpt-oss-120b"
    // This seems correct per request.
    
    setCurrentModelName(name);
    setIsCustomDialogOpen(false);
  };

  return (
    <div className="flex h-full w-full bg-[var(--bg-main)] text-[var(--text-primary)] overflow-hidden">
      <CustomDialog 
         isOpen={isCustomDialogOpen} 
         onClose={() => setIsCustomDialogOpen(false)} 
         onSubmit={handleCustomModelSubmit}
         initialValue={currentModelId}
      />
      <main className="flex-1 flex flex-col relative h-full">
         {/* Top Bar */}
         <div className="absolute top-0 left-0 w-full h-14 flex items-center justify-between px-4 z-10">
            <div className="flex items-center gap-2 md:hidden">
               <button 
                  onClick={toggleSidebar}
                  className="p-2 hover:bg-[var(--bg-hover)] rounded-md text-[var(--text-secondary)]"
               >
                  <PanelLeft size={20} />
               </button>
            </div>
            
            {/* Model Selector */}
            <div className="relative ml-auto md:ml-0 md:mr-auto">
                <button 
                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                    className="flex items-center gap-1 text-lg font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] px-3 py-2 rounded-lg transition-colors"
                >
                   <span>{currentModelName}</span>
                   <ChevronDown size={16} className="text-[var(--text-secondary)]" />
                </button>

                {isModelMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsModelMenuOpen(false)}></div>
                        <div className="absolute top-full left-0 mt-1 w-[220px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden z-20 p-1 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                            <div className="px-2 py-2 text-xs font-medium text-[var(--text-secondary)]">Select Model</div>
                            
                            <button 
                                onClick={() => { setCurrentModelId("openai/gpt-oss-120b:exacto"); setCurrentModelName("GPT 5.1"); setIsModelMenuOpen(false); }}
                                className="flex items-center justify-between w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--bg-hover)] text-sm transition-colors"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[var(--text-primary)] font-medium">GPT 5.1</span>
                                    <span className="text-[var(--text-secondary)] text-xs">Great for complex tasks</span>
                                </div>
                                {currentModelId === "openai/gpt-oss-120b:exacto" && <Check size={16} />}
                            </button>

                            <div className="my-1 border-t border-[var(--border-color)]"></div>

                            <button 
                                onClick={() => { setIsModelMenuOpen(false); setIsCustomDialogOpen(true); }}
                                className="flex items-center justify-between w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--bg-hover)] text-sm transition-colors"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[var(--text-primary)] font-medium">Custom Model</span>
                                    <span className="text-[var(--text-secondary)] text-xs">Enter ID manually</span>
                                </div>
                            </button>
                        </div>
                    </>
                )}
            </div>
         </div>

        <div 
            className="flex-1 overflow-y-auto scroll-smooth"
            ref={scrollContainerRef}
            onScroll={handleScroll}
        >
           <div className="max-w-[800px] mx-auto pt-20 pb-40 px-4 md:px-6 relative">
              
              {/* Loading Skeletons - Smart & Smooth */}
              <FadeWrapper show={isMessagesLoading} className="absolute inset-0 pt-20 px-4 md:px-6 z-10 bg-[var(--bg-main)]">
                  <div className="space-y-10">
                      {/* User message skeleton - Randomized widths */}
                      <div className="flex justify-end">
                          <Skeleton className="h-12 w-[60%] rounded-[26px]" />
                      </div>
                      {/* AI message skeleton - Randomized blocks to look smart */}
                      <div className="flex justify-start gap-4">
                          <div className="space-y-3 w-full max-w-[90%]">
                              <Skeleton className="h-4 w-[30%]" />
                              <div className="space-y-2">
                                  <Skeleton className="h-4 w-[95%]" />
                                  <Skeleton className="h-4 w-[88%]" />
                                  <Skeleton className="h-4 w-[92%]" />
                                  <Skeleton className="h-4 w-[60%]" />
                              </div>
                              <div className="pt-2 space-y-2">
                                  <Skeleton className="h-4 w-[90%]" />
                                  <Skeleton className="h-4 w-[85%]" />
                              </div>
                          </div>
                      </div>
                      {/* User message skeleton 2 */}
                      <div className="flex justify-end">
                          <Skeleton className="h-10 w-[40%] rounded-[26px]" />
                      </div>
                  </div>
              </FadeWrapper>

              {/* Actual Content */}
              <FadeWrapper show={!isMessagesLoading} className="relative z-0">
                  <>
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-100">
                            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Where should we begin?</h2>
                        </div>
                    )}
                    
                    {messages.map((m: any, index: number) => (
                        <ThrottledMessageItem 
                            key={m.id} 
                            message={m}
                            isThinking={isLoading && index === messages.length - 1 && m.role === 'assistant'}
                        />
                    ))}
                  </>
              </FadeWrapper>
              
              {/* Explicit generic Thinking indicator if loading but no assistant message yet */}
              {!isMessagesLoading && isLoading && messages.length > 0 && (messages[messages.length - 1] as any).role === 'user' && (
                 <div className="flex justify-start mb-6 w-full animate-pulse">
                    <div className="w-0 h-0 flex-shrink-0 overflow-hidden"></div>
                    <div className="flex items-center text-[var(--text-secondary)] text-sm ml-4">Thinking...</div>
                 </div>
              )}

              <div ref={messagesEndRef} />
           </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)] to-transparent pt-10 pb-6">
           <div className="max-w-[800px] mx-auto px-4">
              {/* Attachments Preview */}
              {attachments && attachments.length > 0 && (
                  <div className="flex gap-2 mb-2 overflow-x-auto">
                      {Array.from(attachments).map((file, i) => (
                          <div key={i} className="flex items-center gap-2 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)]">
                              <Paperclip size={14} />
                              <span className="truncate max-w-[150px]">{file.name}</span>
                              <button onClick={() => setAttachments(null)} className="hover:text-red-400 ml-1">×</button>
                          </div>
                      ))}
                  </div>
              )}

              <div className="relative bg-[var(--bg-input)] rounded-[26px] flex flex-col border border-[var(--border-color)] shadow-sm focus-within:border-[#676767] transition-colors">
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    multiple 
                 />
                 
                 <textarea 
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Chai"
                    className="w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] pl-14 pr-12 py-3.5 resize-none focus:outline-none max-h-[200px] min-h-[52px] leading-relaxed scrollbar-hide"
                    rows={1}
                 />
                 
                 {/* Left Icons: Attach */}
                 <div className="absolute bottom-2 left-2 flex items-center gap-2 z-20">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[#b4b4b4] hover:text-white transition-colors p-1 rounded-full w-fit"
                    >
                       <div className="w-8 h-8 rounded-full hover:bg-[#424242] flex items-center justify-center transition-colors">
                           <Paperclip size={20} strokeWidth={2} />
                       </div>
                    </button>
                 </div>

                 {/* Right Icons: Send / Stop / Reasoning */}
                 <div className="absolute bottom-2 right-2 flex items-center gap-2 h-[32px]">
                     {/* Reasoning Effort Selector */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsEffortMenuOpen(!isEffortMenuOpen)}
                            className="text-[#b4b4b4] hover:text-white transition-colors p-1 rounded-full w-fit group"
                            title={`Reasoning Effort: ${reasoningEffort}`}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                isEffortMenuOpen || reasoningEffort !== 'medium' 
                                    ? "bg-[#424242] text-white" 
                                    : "hover:bg-[#424242]"
                            )}>
                                <Sparkles size={18} strokeWidth={2} />
                            </div>
                        </button>
                        
                        {isEffortMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsEffortMenuOpen(false)}></div>
                                <div className="absolute bottom-full right-0 mb-2 w-[160px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden z-20 p-1 animate-in fade-in slide-in-from-bottom-2 duration-100 origin-bottom-right">
                                    <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">Reasoning Effort</div>
                                    
                                    {(['low', 'medium', 'high'] as const).map((effort) => (
                                        <button 
                                            key={effort}
                                            onClick={() => { setReasoningEffort(effort); setIsEffortMenuOpen(false); }}
                                            className="flex items-center justify-between w-full text-left px-2 py-2 rounded-lg hover:bg-[var(--bg-hover)] text-sm transition-colors"
                                        >
                                            <span className="text-[var(--text-primary)] capitalize">{effort}</span>
                                            {reasoningEffort === effort && <Check size={14} />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                     {isLoading ? (
                        <button 
                           onClick={() => stop()}
                           className="p-1 rounded-full bg-white text-black hover:opacity-90 transition-all duration-200 flex items-center justify-center w-8 h-8"
                        >
                           <Square size={14} fill="currentColor" />
                        </button>
                     ) : (
                        <button 
                           onClick={() => handleSendMessage()}
                           disabled={!input.trim() && (!attachments || attachments.length === 0)}
                           className={cn(
                              "p-1 rounded-full transition-all duration-200 flex items-center justify-center w-8 h-8",
                              (input.trim() || (attachments && attachments.length > 0))
                                 ? "bg-white text-black hover:opacity-90" 
                                 : "bg-[#676767] text-[#2F2F2F] cursor-default opacity-50"
                           )}
                        >
                           <ArrowUp size={18} strokeWidth={3} />
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
