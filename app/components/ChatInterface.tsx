'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { PanelLeft, Settings2 } from 'lucide-react';
import type { ChatMessage, MessagePart } from '@/lib/chat-types';
import { useChatContext } from './ChatContext';
import { useAttachments } from '@/app/hooks/useAttachments';
import { usePersistedSetting, useAccentColor, useResponseLength, useUserProfile, useLearningMode, ReasoningEffortLevel } from '@/app/hooks/usePersistedSettings';
import { ModelSelector } from './ModelSelector';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { SettingsDialog } from './SettingsDialog';

interface ChatInterfaceProps {
  initialChatId?: string;
}

type EditAttachment = { id: string; url: string; name: string; mediaType: string };

export default function ChatInterface({ initialChatId }: ChatInterfaceProps) {
  const { refreshChats, toggleSidebar, chats } = useChatContext();

  // Settings
  const [currentModelId, setCurrentModelId, isModelIdHydrated] = usePersistedSetting('CHATGPT_MODEL_ID', "x-ai/grok-4.1-fast");
  const [currentModelName, setCurrentModelName, isModelNameHydrated] = usePersistedSetting('CHATGPT_MODEL_NAME', "Smart");
  const [rawReasoningEffort, setRawReasoningEffort] = usePersistedSetting('CHATGPT_REASONING_EFFORT', "medium");
  const { accentColor, setAccentColor, isHydrated: isColorHydrated } = useAccentColor();
  const { responseLength, setResponseLength, isHydrated: isResponseLengthHydrated } = useResponseLength();
  const { userName, setUserName, userGender, setUserGender, isHydrated: isProfileHydrated } = useUserProfile();
  const { learningMode, setLearningMode, isHydrated: isLearningModeHydrated } = useLearningMode();
  
  const isSettingsHydrated = isModelIdHydrated && isModelNameHydrated && isColorHydrated && isResponseLengthHydrated && isProfileHydrated && isLearningModeHydrated;
  
  // Settings dialog state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const reasoningEffort = (rawReasoningEffort as ReasoningEffortLevel) ?? 'medium';
  const setReasoningEffort = useCallback((value: ReasoningEffortLevel) => {
    setRawReasoningEffort(value);
  }, [setRawReasoningEffort]);

  // Attachments
  const {
    attachments,
    hasPendingAttachments,
    handleFileSelect,
    handlePaste,
    removeAttachment,
    clearAttachments,
  } = useAttachments();

  // Chat state
  const [currentChatId, setCurrentChatId] = useState<string | null>(initialChatId || null);
  const chatIdRef = useRef<string | null>(initialChatId || null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const currentModelIdRef = useRef(currentModelId);
  const reasoningEffortRef = useRef(reasoningEffort);

  const responseLengthRef = useRef(responseLength);
  const userNameRef = useRef(userName);
  const userGenderRef = useRef(userGender);
  const learningModeRef = useRef(learningMode);
  
  useEffect(() => { currentModelIdRef.current = currentModelId; }, [currentModelId]);
  useEffect(() => { reasoningEffortRef.current = reasoningEffort; }, [reasoningEffort]);
  useEffect(() => { responseLengthRef.current = responseLength; }, [responseLength]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { userGenderRef.current = userGender; }, [userGender]);
  useEffect(() => { learningModeRef.current = learningMode; }, [learningMode]);

  // Update document title based on current chat
  useEffect(() => {
    if (currentChatId) {
      const currentChat = chats.find(c => c.id === currentChatId);
      const chatTitle = currentChat?.title || 'Chat';
      document.title = `${chatTitle} | Cracker`;
    } else {
      document.title = 'Cracker';
    }
  }, [currentChatId, chats]);

  // Loading states
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false); // Immediate feedback when clicking send
  const [input, setInput] = useState('');
  const [dismissedError, setDismissedError] = useState(false);

  // Streaming stats
  const streamingStartTimeRef = useRef<number | null>(null);
  const [streamingStats, setStreamingStats] = useState<{ tokensPerSecond: number; modelId: string | null }>({ tokensPerSecond: 0, modelId: null });

  // Active generation state
  const [activeGeneration, setActiveGeneration] = useState<{
    id: string;
    status: 'streaming' | 'completed' | 'failed';
    partialText?: string;
    partialReasoning?: string;
    startedAt?: string;
    lastUpdateAt?: string;
  } | null>(null);
  const generationPollRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for state management
  const ignoreNextChatIdChangeRef = useRef(false);
  const isRegeneratingRef = useRef(false);

  // Sync state when prop changes
  useEffect(() => {
    setCurrentChatId(initialChatId || null);
    chatIdRef.current = initialChatId || null;
  }, [initialChatId]);

  // Transport - body function accesses refs at call time, not render time
  // eslint-disable-next-line react-hooks/refs
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    body: () => ({
      model: currentModelIdRef.current,
      reasoningEffort: reasoningEffortRef.current,
      chatId: chatIdRef.current,
      responseLength: responseLengthRef.current,
      userName: userNameRef.current,
      userGender: userGenderRef.current,
      learningMode: learningModeRef.current,
    }),
  }), []);

  // useChat hook
  const chatHelpers = useChat({
    transport,
    experimental_throttle: 50,
    onError: (err: Error) => console.error("Chat Error:", err),
    onFinish: async () => {
      const activeId = chatIdRef.current;
      if (activeId) {
        if (isRegeneratingRef.current) {
          await fetch('/api/messages/last-assistant', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: activeId })
          });
          isRegeneratingRef.current = false;
        }
        
        try {
          const statsRes = await fetch(`/api/chat?chatId=${activeId}`);
          if (statsRes.ok) {
            const serverStats = await statsRes.json();
            if (serverStats.tokensPerSecond) {
              setStreamingStats({ 
                modelId: serverStats.modelId || currentModelIdRef.current, 
                tokensPerSecond: serverStats.tokensPerSecond 
              });
            }
          }
        } catch (e) {
          console.error('Failed to fetch completion stats:', e);
        }
      }
    },
  });

  const { messages, status, stop, setMessages, regenerate, sendMessage, error } = chatHelpers;
  const typedMessages = messages as unknown as ChatMessage[];
  const isStreaming = status === 'submitted' || status === 'streaming';
  const isLoading = isStreaming || activeGeneration?.status === 'streaming';

  // Handle stop with saving partial content
  const handleStop = useCallback(async () => {
    const activeId = chatIdRef.current;
    if (!activeId) {
      stop();
      return;
    }
    
    // Get the current messages BEFORE stopping (stop() might clear them)
    const currentMessages = [...messagesRef.current];
    const lastMessage = currentMessages[currentMessages.length - 1];
    
    // Extract partial content if there's an assistant message
    let partialText = '';
    let partialReasoning = '';
    
    if (lastMessage?.role === 'assistant') {
      const msgParts = (lastMessage as { parts?: unknown[] }).parts;
      if (Array.isArray(msgParts)) {
        for (const part of msgParts) {
          if (typeof part === 'object' && part !== null) {
            const p = part as Record<string, unknown>;
            if (p.type === 'text' && typeof p.text === 'string') {
              partialText += p.text;
            } else if (p.type === 'reasoning' && typeof p.text === 'string') {
              partialReasoning += p.text;
            }
          }
        }
      }
    }
    
    // Determine stop type based on what content we have:
    // 1. No content at all = stopped during connection (show "stopped_connection")
    // 2. Has reasoning but no text = stopped during thinking (show "stopped_thinking")
    // 3. Has text = stopped during streaming (no indicator, just keep text)
    
    let stopType: 'connection' | 'thinking' | 'streaming';
    if (partialText) {
      stopType = 'streaming';
    } else if (partialReasoning) {
      stopType = 'thinking';
    } else {
      stopType = 'connection';
    }
    
    // Save to DB FIRST (before stop() which might clear state)
    try {
      await fetch('/api/messages/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeId,
          partialText,
          partialReasoning,
          stopType,
          model: currentModelIdRef.current,
        }),
      });
    } catch (e) {
      console.error('Failed to save stopped message:', e);
    }
    
    // Now stop the streaming
    stop();
    
    // Reload messages from database to show the stopped state properly
    // (setMessages after stop() often gets overwritten by useChat)
    setTimeout(async () => {
      try {
        const res = await fetch(`/api/chats/${activeId}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const uiMessages = data.map((msg: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let parts: Array<any>;
            if (Array.isArray(msg.content)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              parts = msg.content.map((p: any) => {
                if (typeof p === 'string') return { type: 'text', text: p };
                if (p.type === 'text') return { type: 'text', text: p.text || '' };
                if (p.type === 'reasoning') return { type: 'reasoning', text: p.text || p.reasoning || '' };
                if (p.type === 'stopped') return { type: 'stopped', stopType: p.stopType };
                if (p.type === 'source' || p.type === 'source-url') return { type: 'source', url: p.url, title: p.title, source: p.source };
                return p;
              });
            } else {
              parts = [{ type: 'text', text: msg.content || '' }];
            }
            return { id: msg.id, role: msg.role, parts, model: msg.model, tokensPerSecond: msg.tokensPerSecond };
          });
          setMessages(uiMessages as Parameters<typeof setMessages>[0]);
        }
      } catch (e) {
        console.error('Failed to reload messages after stop:', e);
      }
    }, 100);
  }, [stop, setMessages]);

  // Track streaming start
  useEffect(() => {
    console.log(`[CLIENT DEBUG] ${new Date().toISOString()} useChat status changed: ${status}`);
    if (status === 'streaming' && !streamingStartTimeRef.current) {
      streamingStartTimeRef.current = Date.now();
      console.log(`[CLIENT DEBUG] ${new Date().toISOString()} === STREAMING STARTED ===`);
      setStreamingStats({ modelId: currentModelId, tokensPerSecond: 0 });
    } else if (status === 'ready') {
      streamingStartTimeRef.current = null;
    } else if (status === 'submitted') {
      console.log(`[CLIENT DEBUG] ${new Date().toISOString()} === REQUEST SUBMITTED (waiting for response) ===`);
    }
  }, [status, currentModelId]);

  // Reset dismissed error
  useEffect(() => {
    if (error) setDismissedError(false);
  }, [error]);

  // Sync messages ref
  useEffect(() => {
    messagesRef.current = typedMessages;
  }, [typedMessages]);

  // Load messages when chat ID changes
  useEffect(() => {
    if (currentChatId) {
      if (ignoreNextChatIdChangeRef.current) {
        ignoreNextChatIdChangeRef.current = false;
        return;
      }

      setIsMessagesLoading(true);
      fetch(`/api/chats/${currentChatId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const uiMessages = data.map((msg: any) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let parts: Array<any>;
              
              if (Array.isArray(msg.content)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                parts = msg.content.map((p: any) => {
                  if (typeof p === 'string') return { type: 'text', text: p };
                  if (p.type === 'text') return { type: 'text', text: p.text || '' };
                  if (p.type === 'reasoning') return { type: 'reasoning', text: p.text || p.reasoning || '' };
                  if (p.type === 'stopped') return { type: 'stopped', stopType: p.stopType };
                  if (p.type === 'image') return { type: 'file', url: p.image || p.url, mediaType: p.mediaType || 'image/png', filename: p.name || 'image' };
                  if (p.type === 'file') return { type: 'file', url: p.data || p.url, mediaType: p.mediaType || p.mimeType || 'application/octet-stream', filename: p.filename || p.name || 'file' };
                  if (p.type === 'source' || p.type === 'source-url') return { type: 'source', url: p.url, title: p.title, source: p.source };
                  if (p.type === 'tool-invocation') return p;
                  if (typeof p === 'object' && p !== null) return { type: 'text', text: p.text || '' };
                  return { type: 'text', text: String(p || '') };
                });
              } else if (typeof msg.content === 'string') {
                parts = [{ type: 'text', text: msg.content }];
              } else {
                parts = [{ type: 'text', text: '' }];
              }
              
              return { id: msg.id, role: msg.role, parts, model: msg.model, tokensPerSecond: msg.tokensPerSecond };
            });
            setMessages(uiMessages as Parameters<typeof setMessages>[0]);
          }
        })
        .catch(err => console.error("Failed to fetch messages:", err))
        .finally(() => setIsMessagesLoading(false));
      
      // Check for active generations
      fetch(`/api/generate?chatId=${currentChatId}`)
        .then(res => res.json())
        .then(genData => {
          if (genData.status === 'streaming') {
            setActiveGeneration({
              id: genData.id,
              status: genData.status,
              partialText: genData.partialText,
              partialReasoning: genData.partialReasoning,
              startedAt: genData.startedAt,
              lastUpdateAt: genData.lastUpdateAt,
            });
          } else {
            setActiveGeneration(null);
          }
        })
        .catch(() => setActiveGeneration(null));
    } else {
      setMessages([]);
      setIsMessagesLoading(false);
      setActiveGeneration(null);
    }
  }, [currentChatId, setMessages]);

  // Poll for active generation progress
  useEffect(() => {
    if (!activeGeneration || activeGeneration.status !== 'streaming') {
      if (generationPollRef.current) {
        clearInterval(generationPollRef.current);
        generationPollRef.current = null;
      }
      return;
    }

    generationPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate?generationId=${activeGeneration.id}`);
        const data = await res.json();
        
        if (data.status === 'none') {
          setActiveGeneration(null);
          if (currentChatId) {
            const msgRes = await fetch(`/api/chats/${currentChatId}`);
            const msgData = await msgRes.json();
            if (Array.isArray(msgData)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const uiMessages = msgData.map((msg: any) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let parts: Array<any>;
                if (Array.isArray(msg.content)) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  parts = msg.content.map((p: any) => {
                    if (typeof p === 'string') return { type: 'text', text: p };
                    if (p.type === 'text') return { type: 'text', text: p.text || '' };
                    if (p.type === 'reasoning') return { type: 'reasoning', text: p.text || p.reasoning || '' };
                    if (p.type === 'stopped') return { type: 'stopped', stopType: p.stopType };
                    if (p.type === 'source' || p.type === 'source-url') return { type: 'source', url: p.url, title: p.title, source: p.source };
                    return p;
                  });
                } else {
                  parts = [{ type: 'text', text: msg.content || '' }];
                }
                return { id: msg.id, role: msg.role, parts, model: msg.model, tokensPerSecond: msg.tokensPerSecond };
              });
              setMessages(uiMessages as Parameters<typeof setMessages>[0]);
            }
          }
        } else if (data.status === 'failed') {
          setActiveGeneration(null);
          console.error('Background generation failed:', data.error);
        } else if (data.status === 'streaming') {
          setActiveGeneration({
            id: data.id,
            status: data.status,
            partialText: data.partialText,
            partialReasoning: data.partialReasoning,
            startedAt: data.startedAt,
            lastUpdateAt: data.lastUpdateAt,
          });
        }
      } catch (err) {
        console.error('Failed to poll generation status:', err);
      }
    }, 1000); // Poll every 1 second for smoother resume experience

    return () => {
      if (generationPollRef.current) {
        clearInterval(generationPollRef.current);
        generationPollRef.current = null;
      }
    };
  }, [activeGeneration, currentChatId, setMessages]);

  // Handle message edit
  const handleEditMessage = useCallback(async (index: number, newContent: string, editAttachments?: EditAttachment[]) => {
    const currentMessages = messagesRef.current;
    const chatId = chatIdRef.current;
    if (!chatId) return;

    try {
      const messagesToDeleteCount = currentMessages.length - index;
      await fetch('/api/chat/truncate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, count: messagesToDeleteCount })
      });

      const keptMessages = currentMessages.slice(0, index);
      setMessages(keptMessages as Parameters<typeof setMessages>[0]);

      let contentToSave: string | MessagePart[];
      if (editAttachments && editAttachments.length > 0) {
        contentToSave = [
          { type: 'text', text: newContent },
          ...editAttachments.map(att => {
            if (att.mediaType.startsWith('image/')) {
              return { type: 'image' as const, image: att.url, mediaType: att.mediaType, name: att.name };
            }
            return { type: 'file' as const, data: att.url, url: att.url, mediaType: att.mediaType, name: att.name, filename: att.name };
          })
        ];
      } else {
        contentToSave = newContent;
      }

      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          role: 'user',
          content: Array.isArray(contentToSave) ? contentToSave : [{ type: 'text', text: contentToSave }]
        })
      });
    } catch (err) {
      console.error("Failed to edit message:", err);
    }
  }, [setMessages]);

  const stableHandleEdit = useCallback((index: number, newContent: string, editAttachments?: EditAttachment[]) => {
    handleEditMessage(index, newContent, editAttachments).then(() => {
      if (editAttachments && editAttachments.length > 0) {
        const fileUIParts = editAttachments.map(att => ({
          type: 'file' as const,
          filename: att.name,
          mediaType: att.mediaType,
          url: att.url,
        }));
        sendMessage({ text: newContent, files: fileUIParts });
      } else {
        sendMessage({ text: newContent });
      }
    });
  }, [handleEditMessage, sendMessage]);

  // Handle send message
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() && attachments.length === 0) return;
    if (hasPendingAttachments) {
      console.warn('Attachments are still uploading.');
      return;
    }

    // Show immediate loading feedback
    setIsSending(true);
    
    const userMessage = input;
    
    type PreparedAttachment =
      | { type: 'image'; name: string; image: string; mediaType: string }
      | { type: 'file'; name: string; data: string; mediaType: string; mimeType: string; filename?: string };

    const processedAttachments: PreparedAttachment[] = attachments.reduce<PreparedAttachment[]>((acc, attachment) => {
      if (!attachment.dataUrl) return acc;
      if (attachment.mediaType.startsWith('image/')) {
        acc.push({ name: attachment.name, type: 'image', image: attachment.dataUrl, mediaType: attachment.mediaType });
      } else {
        acc.push({ name: attachment.name, type: 'file', data: attachment.dataUrl, mediaType: attachment.mediaType, mimeType: attachment.mediaType, filename: attachment.name });
      }
      return acc;
    }, []);

    setInput('');
    clearAttachments();

    try {
      let activeChatId = currentChatId;
      let isNewChat = false;

      if (!activeChatId) {
        const res = await fetch('/api/chats', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: null }) 
        });
        const newChat = await res.json();
        if (newChat?.id) {
          activeChatId = newChat.id;
          ignoreNextChatIdChangeRef.current = true;
          setCurrentChatId(newChat.id);
          chatIdRef.current = newChat.id;
          isNewChat = true;
          refreshChats();
          window.history.replaceState(null, '', `/chat/${newChat.id}`);
        }
      }

      let finalContent: string | MessagePart[] = userMessage;
      if (processedAttachments.length > 0) {
        const structuredParts: MessagePart[] = [
          { type: 'text', text: userMessage },
          ...processedAttachments.map(att => {
            if (att.type === 'image') {
              return { type: 'image', image: att.image, mediaType: att.mediaType, name: att.name } satisfies MessagePart;
            }
            return { type: 'file', data: att.data, mediaType: att.mediaType, mimeType: att.mimeType, filename: att.filename || att.name, name: att.name } satisfies MessagePart;
          })
        ];
        finalContent = structuredParts;
      }

      if (activeChatId) {
        const partsToSave = Array.isArray(finalContent) ? finalContent : [{ type: 'text', text: finalContent }];
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: activeChatId, role: 'user', content: partsToSave })
        });

        if (isNewChat) {
          fetch('/api/generate-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: activeChatId, prompt: userMessage })
          }).then(() => refreshChats());
        }
      }

      if (!activeChatId) {
        console.error("Failed to create or retrieve chat ID.");
        return;
      }

      console.log(`[CLIENT DEBUG] ${new Date().toISOString()} === CALLING sendMessage() ===`);
      console.log(`[CLIENT DEBUG] Model: ${currentModelIdRef.current}, ChatId: ${activeChatId}`);
      
      if (processedAttachments.length > 0) {
        const fileUIParts = processedAttachments.map(att => ({
          type: 'file' as const,
          filename: att.name,
          mediaType: att.type === 'image' ? att.mediaType : att.mediaType,
          url: att.type === 'image' ? att.image : att.data,
        }));
        sendMessage({ text: userMessage, files: fileUIParts });
      } else {
        sendMessage({ text: userMessage });
      }
      console.log(`[CLIENT DEBUG] ${new Date().toISOString()} sendMessage() called, waiting for response...`);
      // Reset sending state after a short delay to allow UI to transition
      setTimeout(() => setIsSending(false), 100);
    } catch (err) {
      console.error("[CLIENT DEBUG] Failed to send message:", err);
      setIsSending(false);
    }
  }, [input, attachments, hasPendingAttachments, currentChatId, clearAttachments, refreshChats, sendMessage]);

  const handleModelChange = useCallback((id: string, name: string) => {
    setCurrentModelId(id);
    setCurrentModelName(name);
  }, [setCurrentModelId, setCurrentModelName]);

  const handleRetry = useCallback(() => {
    isRegeneratingRef.current = true;
    regenerate();
  }, [regenerate]);

  return (
    <div className="flex h-full w-full bg-[var(--bg-main)] text-[var(--text-primary)]">
      <main className="flex-1 flex flex-col h-full min-h-0">
        {/* Top Bar - outside overflow to allow dropdowns */}
        <div className="flex-shrink-0 w-full h-14 flex items-center justify-between px-4 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] relative z-50 dropdown-container">
          {/* Left: Mobile menu button + Settings */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleSidebar}
              className="w-10 h-10 border border-[var(--border-color)] bg-[#1a1a1a] text-[var(--text-secondary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)] flex items-center justify-center transition-all duration-150"
              aria-label="Toggle sidebar"
            >
              <PanelLeft size={18} />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 border border-[var(--border-color)] bg-[#1a1a1a] text-[var(--text-secondary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)] flex items-center justify-center transition-all duration-150 group"
              aria-label="Settings"
            >
              <Settings2 size={18} className="group-hover:rotate-45 transition-transform duration-300" />
            </button>
          </div>

          {/* Right on mobile, Left on desktop: Model Selector */}
          <div className="flex-1 flex justify-end md:justify-start">
            <ModelSelector
              currentModelId={currentModelId}
              currentModelName={currentModelName}
              onModelChange={handleModelChange}
              accentColor={accentColor}
              onAccentColorChange={setAccentColor}
              isHydrated={isSettingsHydrated}
            />
          </div>

          {/* Right: Settings Button */}
          <div className="hidden md:flex items-center">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 border border-[var(--border-color)] bg-[#1a1a1a] text-[var(--text-secondary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)] flex items-center justify-center transition-all duration-150 group"
              aria-label="Settings"
            >
              <Settings2 size={18} className="group-hover:rotate-45 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Settings Dialog */}
        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          responseLength={responseLength}
          onResponseLengthChange={setResponseLength}
          learningMode={learningMode}
          onLearningModeChange={setLearningMode}
          userName={userName}
          onUserNameChange={setUserName}
          userGender={userGender}
          onUserGenderChange={setUserGender}
          accentColor={accentColor}
          onAccentColorChange={setAccentColor}
        />

        {/* Messages - this container can have overflow hidden */}
        <MessageList
          messages={typedMessages}
          isMessagesLoading={isMessagesLoading}
          isSending={isSending}
          isStreaming={isStreaming}
          status={status}
          activeGeneration={activeGeneration}
          streamingStats={streamingStats}
          currentChatId={currentChatId}
          error={error}
          onEdit={stableHandleEdit}
          onRetry={handleRetry}
          onDismissError={() => setDismissedError(true)}
          dismissedError={dismissedError}
          onSuggestionClick={setInput}
        />

        {/* Input */}
        <ChatInput
          input={input}
          onInputChange={setInput}
          onSend={handleSendMessage}
          onStop={handleStop}
          isLoading={isLoading}
          attachments={attachments}
          hasPendingAttachments={hasPendingAttachments}
          onFileSelect={handleFileSelect}
          onPaste={handlePaste}
          onRemoveAttachment={removeAttachment}
          reasoningEffort={reasoningEffort}
          onReasoningEffortChange={setReasoningEffort}
          chatId={currentChatId}
        />
      </main>
    </div>
  );
}
