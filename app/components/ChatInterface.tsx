'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { PanelLeft, Settings2 } from 'lucide-react';
import type { ChatMessage, MessagePart } from '@/lib/chat-types';
import { useChatContext } from './ChatContext';
import { updateFavicon, getAccentColorFromStorage } from './SettingsContext';
import { useAttachments } from '@/app/hooks/useAttachments';
import { usePersistedSetting, useAccentColor, useResponseLength, useUserProfile, useLearningMode, useChatMode, useCustomInstructions, ReasoningEffortLevel, ChatMode } from '@/app/hooks/usePersistedSettings';
import { ModelSelector } from './ModelSelector';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { SettingsDialog } from './SettingsDialog';
import { ChatBackground } from './ChatBackground';

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
  const { chatMode, setChatMode, isHydrated: isChatModeHydrated } = useChatMode();
  const { customInstructions, setCustomInstructions, isHydrated: isCustomInstructionsHydrated } = useCustomInstructions();
  
  const isSettingsHydrated = isModelIdHydrated && isModelNameHydrated && isColorHydrated && isResponseLengthHydrated && isProfileHydrated && isLearningModeHydrated && isChatModeHydrated && isCustomInstructionsHydrated;
  
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
  const chatModeRef = useRef(chatMode);
  const customInstructionsRef = useRef(customInstructions);
  
  useEffect(() => { currentModelIdRef.current = currentModelId; }, [currentModelId]);
  useEffect(() => { reasoningEffortRef.current = reasoningEffort; }, [reasoningEffort]);
  useEffect(() => { responseLengthRef.current = responseLength; }, [responseLength]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { userGenderRef.current = userGender; }, [userGender]);
  useEffect(() => { learningModeRef.current = learningMode; }, [learningMode]);
  useEffect(() => { chatModeRef.current = chatMode; }, [chatMode]);
  useEffect(() => { customInstructionsRef.current = customInstructions; }, [customInstructions]);

  // Re-apply favicon on mount to handle client-side navigation between chats
  useEffect(() => {
    const storedColor = getAccentColorFromStorage();
    updateFavicon(storedColor);
  }, []);

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

  // Active generation state (for background generation reconnection)
  const [activeGeneration, setActiveGeneration] = useState<{
    id: string;
    status: 'streaming' | 'completed' | 'failed';
    partialText?: string;
    partialReasoning?: string;
    modelId?: string;
    startedAt?: string;
    lastUpdateAt?: string;
  } | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const sseAbortControllerRef = useRef<AbortController | null>(null);
  const reconnectPlaceholderIdRef = useRef<string | null>(null);

  // Smooth reveal animation refs for SSE content
  const sseTargetTextRef = useRef('');
  const sseTargetReasoningRef = useRef('');
  const sseRevealedTextRef = useRef('');
  const sseRevealedReasoningRef = useRef('');
  const sseRevealAnimationRef = useRef<number | null>(null);
  const sseLastRevealTimeRef = useRef(0);
  const ssePlaceholderIdRef = useRef<string | null>(null);
  const sseIsReconnectionRef = useRef(false);

  // Deep research state
  const [deepResearchState, setDeepResearchState] = useState<{
    isActive: boolean;
    placeholderId: string | null;
    clarifyQuestions: string[] | null;
    query: string | null;
    chatId: string | null;
  }>({
    isActive: false,
    placeholderId: null,
    clarifyQuestions: null,
    query: null,
    chatId: null,
  });

  // Refs for state management
  const ignoreNextChatIdChangeRef = useRef(false);
  const isRegeneratingRef = useRef(false);

  // Sync state when prop changes and cleanup SSE connection
  useEffect(() => {
    // Cleanup any existing SSE connection when chatId changes
    if (sseAbortControllerRef.current) {
      sseAbortControllerRef.current.abort();
      sseAbortControllerRef.current = null;
    }
    setIsReconnecting(false);
    setActiveGeneration(null);
    
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
      customInstructions: customInstructionsRef.current,
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
  const isLoading = isStreaming || activeGeneration?.status === 'streaming' || deepResearchState.isActive || isReconnecting;

  // Handle stop with saving partial content
  const handleStop = useCallback(async () => {
    const activeId = chatIdRef.current;
    
    // If we're in a reconnected SSE stream, abort it and cleanup
    if (isReconnecting && sseAbortControllerRef.current) {
      console.log('[Stop] Aborting SSE reconnection stream');
      sseAbortControllerRef.current.abort();
      sseAbortControllerRef.current = null;
      setIsReconnecting(false);
      
      // The server will detect the connection close and save the partial content
      // via stale detection, or the generation will complete normally
      // Either way, reload messages from DB after a short delay
      if (activeId) {
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
                    if (p.type === 'generated-image') return { type: 'generated-image', data: p.data, mediaType: p.mediaType };
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
            console.error('[Stop] Failed to reload messages after SSE abort:', e);
          }
        }, 500);
      }
      setActiveGeneration(null);
      return;
    }
    
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
                if (p.type === 'generated-image') return { type: 'generated-image', data: p.data, mediaType: p.mediaType };
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
  }, [stop, setMessages, isReconnecting]);

  // Deep search function with SSE streaming
  const startDeepSearch = useCallback(async (
    query: string, 
    chatId: string, 
    placeholderId: string,
    skipClarify: boolean,
    clarifyAnswers?: { q: string; a: string }[]
  ) => {
    setDeepResearchState({
      isActive: true,
      placeholderId,
      clarifyQuestions: null,
      query,
      chatId,
    });

    try {
      const response = await fetch('/api/deep-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          chatId, 
          skipClarify,
          clarifyAnswers 
        })
      });

      if (!response.ok) {
        console.error('Deep search failed:', response.status);
        setMessages(prev => prev.filter(m => m.id !== placeholderId));
        setIsSending(false);
        setDeepResearchState({ isActive: false, placeholderId: null, clarifyQuestions: null, query: null, chatId: null });
        return;
      }

      // Check if response is JSON (background started) or SSE (clarifying questions)
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        // Background search started via Inngest - connect to /api/generate/stream for progress
        const jsonData = await response.json();
        console.log('[DeepSearch] Background started, generationId:', jsonData.generationId);
        
        // Update placeholder ID to match what SSE expects (assistant-{generationId})
        const newPlaceholderId = `assistant-${jsonData.generationId}`;
        
        // Update message with new ID and show progress
        setMessages(prev => {
          // Also update messagesRef immediately for SSE effect
          const updated = prev.map(m => 
            m.id === placeholderId 
              ? { ...m, id: newPlaceholderId, parts: [{ type: 'deep-research-progress', progress: {
                  phase: 'starting',
                  phaseDescription: 'Research in progress...',
                  percent: 0,
                  message: 'Starting deep research...',
                  searches: [],
                  sources: [],
                  isComplete: false,
                }}] as unknown as typeof m.parts}
              : m
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messagesRef.current = updated as any;
          return updated;
        });
        
        // Set active generation to trigger SSE polling via existing mechanism
        // Small delay ensures messagesRef is updated before SSE effect runs
        setTimeout(() => {
          setActiveGeneration({
            id: jsonData.generationId,
            status: 'streaming',
            modelId: 'deep-search',
            partialText: '',
            partialReasoning: '',
          });
        }, 50);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let streamedText = '';
      let sources: { url: string; title: string }[] = [];
      const searches: { query: string; index: number; total: number }[] = [];
      let currentProgress = {
        phase: 'planning' as string,
        phaseDescription: 'Starting research...',
        percent: 0,
        message: 'Initializing',
        searches: [] as { query: string; index: number; total: number }[],
        sources: [] as { url: string; title: string }[],
        isComplete: false,
      };

      if (reader) {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'clarify') {
                  // Show clarifying questions
                  setDeepResearchState(prev => ({
                    ...prev,
                    clarifyQuestions: data.questions,
                  }));
                  setMessages(prev => prev.map(m => 
                    m.id === placeholderId 
                      ? { ...m, parts: [{ type: 'clarify-questions', questions: data.questions }] as unknown as typeof m.parts }
                      : m
                  ));
                  setIsSending(false);
                  return; // Wait for user input
                }
                
                if (data.type === 'phase') {
                  currentProgress = { ...currentProgress, phase: data.phase, phaseDescription: data.description };
                }
                
                if (data.type === 'progress') {
                  currentProgress = { ...currentProgress, percent: data.percent, message: data.message };
                }
                
                if (data.type === 'search') {
                  searches.push({ query: data.query, index: data.index, total: data.total });
                  currentProgress = { ...currentProgress, searches: [...searches] };
                }
                
                if (data.type === 'source') {
                  sources.push({ url: data.url, title: data.title });
                  currentProgress = { ...currentProgress, sources: [...sources] };
                }
                
                if (data.type === 'report_start') {
                  // Switch from progress view to text streaming
                }
                
                if (data.type === 'text') {
                  streamedText += data.text;
                  // Update with both progress and text
                  setMessages(prev => prev.map(m => 
                    m.id === placeholderId 
                      ? { ...m, parts: [
                          { type: 'deep-research-progress', progress: currentProgress },
                          { type: 'text', text: streamedText }
                        ] as unknown as typeof m.parts}
                      : m
                  ));
                  continue;
                }
                
                if (data.type === 'complete') {
                  currentProgress = { ...currentProgress, isComplete: true, elapsed: data.elapsed } as typeof currentProgress;
                  sources = data.sources;
                }
                
                // Update progress in message
                if (data.type !== 'text') {
                  setMessages(prev => prev.map(m => 
                    m.id === placeholderId 
                      ? { ...m, parts: (streamedText 
                          ? [{ type: 'deep-research-progress', progress: currentProgress }, { type: 'text', text: streamedText }]
                          : [{ type: 'deep-research-progress', progress: currentProgress }]
                        ) as unknown as typeof m.parts}
                      : m
                  ));
                }
                
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
      
      console.log(`[CLIENT DEBUG] Deep search complete`);
      
      // After completion, reload from DB to get properly saved message with sources
      setTimeout(async () => {
        try {
          const msgRes = await fetch(`/api/chats/${chatId}`);
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
                  if (p.type === 'generated-image') return { type: 'generated-image', data: p.data, mediaType: p.mediaType };
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
          console.error('Failed to reload messages after deep search:', e);
        }
        setIsSending(false);
        setDeepResearchState({ isActive: false, placeholderId: null, clarifyQuestions: null, query: null, chatId: null });
      }, 300);
      
    } catch (err) {
      console.error('Deep search error:', err);
      setMessages(prev => prev.filter(m => m.id !== placeholderId));
      setIsSending(false);
      setDeepResearchState({ isActive: false, placeholderId: null, clarifyQuestions: null, query: null, chatId: null });
    }
  }, [setMessages]);

  // Handle clarify answers submission
  const handleClarifySubmit = useCallback((answers: { q: string; a: string }[]) => {
    if (!deepResearchState.query || !deepResearchState.chatId || !deepResearchState.placeholderId) return;
    
    // Update UI to show research starting
    setMessages(prev => prev.map(m => 
      m.id === deepResearchState.placeholderId 
        ? { ...m, parts: [{ type: 'deep-research-progress', progress: { 
            phase: 'planning', 
            phaseDescription: 'Starting research with your input...',
            percent: 0,
            message: 'Initializing',
            searches: [],
            sources: [],
            isComplete: false
          }}] as unknown as typeof m.parts}
        : m
    ));
    
    setIsSending(true);
    startDeepSearch(
      deepResearchState.query, 
      deepResearchState.chatId, 
      deepResearchState.placeholderId, 
      true,
      answers
    );
  }, [deepResearchState, setMessages, startDeepSearch]);

  // Handle skip clarify
  const handleSkipClarify = useCallback(() => {
    if (!deepResearchState.query || !deepResearchState.chatId || !deepResearchState.placeholderId) return;
    
    setMessages(prev => prev.map(m => 
      m.id === deepResearchState.placeholderId 
        ? { ...m, parts: [{ type: 'deep-research-progress', progress: { 
            phase: 'planning', 
            phaseDescription: 'Starting research...',
            percent: 0,
            message: 'Initializing',
            searches: [],
            sources: [],
            isComplete: false
          }}] as unknown as typeof m.parts}
        : m
    ));
    
    setIsSending(true);
    startDeepSearch(
      deepResearchState.query, 
      deepResearchState.chatId, 
      deepResearchState.placeholderId, 
      true
    );
  }, [deepResearchState, setMessages, startDeepSearch]);

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
                  if (p.type === 'generated-image') return { type: 'generated-image', data: p.data, mediaType: p.mediaType };
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
      
      // Check for active generations (background generation that might be in progress)
      fetch(`/api/generate?chatId=${currentChatId}`)
        .then(res => res.json())
        .then(genData => {
          if (genData.status === 'streaming') {
            console.log(`[ChatInterface] Found active generation: ${genData.id} for chat ${currentChatId}`);
            setActiveGeneration({
              id: genData.id,
              status: genData.status,
              partialText: genData.partialText,
              partialReasoning: genData.partialReasoning,
              modelId: genData.modelId,
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

  // SSE streaming for active generation (handles both fresh and reconnection)
  useEffect(() => {
    if (!activeGeneration || activeGeneration.status !== 'streaming') {
      // Cleanup any existing SSE connection
      if (sseAbortControllerRef.current) {
        sseAbortControllerRef.current.abort();
        sseAbortControllerRef.current = null;
      }
      setIsReconnecting(false);
      return;
    }

    // Determine the placeholder ID - either the existing assistant message or create a new one
    // Fresh generation uses `assistant-{id}`, reconnection uses `reconnect-{id}`
    const freshPlaceholderId = `assistant-${activeGeneration.id}`;
    const reconnectPlaceholderId = `reconnect-${activeGeneration.id}`;
    
    // Check if there's already an assistant placeholder for this generation
    const hasFreshPlaceholder = messagesRef.current.some(m => m.id === freshPlaceholderId);
    const hasReconnectPlaceholder = messagesRef.current.some(m => m.id === reconnectPlaceholderId);
    
    let placeholderId: string;
    let isActualReconnection = false;
    
    if (hasFreshPlaceholder) {
      // Fresh generation - use existing placeholder
      placeholderId = freshPlaceholderId;
      isActualReconnection = false;
    } else if (hasReconnectPlaceholder) {
      // Already reconnected
      placeholderId = reconnectPlaceholderId;
      isActualReconnection = true;
    } else {
      // Reconnection scenario - create new placeholder
      placeholderId = reconnectPlaceholderId;
      isActualReconnection = true;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMessages((prev: any[]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: Array<any> = [];
        
        // For deep-search, show progress indicator
        if (activeGeneration.modelId === 'deep-search') {
          // Try to parse progress from partialText (stored as JSON)
          let progress = { phase: 'searching', percent: 0, message: 'Resuming research...' };
          if (activeGeneration.partialText) {
            try {
              progress = JSON.parse(activeGeneration.partialText);
            } catch { /* ignore */ }
          }
          parts.push({
            type: 'deep-research-progress',
            progress: {
              phase: progress.phase || 'searching',
              phaseDescription: progress.message || 'Resuming research...',
              percent: progress.percent || 0,
              message: progress.message || 'Resuming research...',
            },
          });
        } else {
          // Regular chat - show text/reasoning
          if (activeGeneration.partialReasoning) {
            parts.push({ type: 'reasoning', text: activeGeneration.partialReasoning });
          }
          if (activeGeneration.partialText) {
            parts.push({ type: 'text', text: activeGeneration.partialText });
          }
          // Only show reconnecting indicator for actual reconnections
          parts.push({ type: 'reconnecting', isReconnecting: true });
        }
        
        return [...prev, {
          id: placeholderId,
          role: 'assistant',
          parts,
          model: activeGeneration.modelId,
        }];
      });
    }
    
    reconnectPlaceholderIdRef.current = placeholderId;
    setIsReconnecting(isActualReconnection);
    console.log(`[SSE] Connecting for generation ${activeGeneration.id}, isReconnection: ${isActualReconnection}`);

    // Initialize smooth reveal refs
    sseTargetTextRef.current = activeGeneration.partialText || '';
    sseTargetReasoningRef.current = activeGeneration.partialReasoning || '';
    sseRevealedTextRef.current = activeGeneration.partialText || '';
    sseRevealedReasoningRef.current = activeGeneration.partialReasoning || '';
    ssePlaceholderIdRef.current = placeholderId;
    sseIsReconnectionRef.current = isActualReconnection;
    sseLastRevealTimeRef.current = 0;

    // Smooth reveal animation function
    const CHARS_PER_FRAME = 15; // Characters to reveal per frame (~60fps = ~900 chars/sec)
    const FRAME_INTERVAL = 16; // ~60fps
    
    const runRevealAnimation = () => {
      const now = Date.now();
      if (now - sseLastRevealTimeRef.current < FRAME_INTERVAL) {
        sseRevealAnimationRef.current = requestAnimationFrame(runRevealAnimation);
        return;
      }
      sseLastRevealTimeRef.current = now;

      let needsUpdate = false;
      
      // Reveal reasoning first
      if (sseRevealedReasoningRef.current.length < sseTargetReasoningRef.current.length) {
        sseRevealedReasoningRef.current = sseTargetReasoningRef.current.slice(
          0, 
          sseRevealedReasoningRef.current.length + CHARS_PER_FRAME
        );
        needsUpdate = true;
      }
      
      // Then reveal text (only after reasoning is fully revealed)
      if (sseRevealedReasoningRef.current.length >= sseTargetReasoningRef.current.length &&
          sseRevealedTextRef.current.length < sseTargetTextRef.current.length) {
        sseRevealedTextRef.current = sseTargetTextRef.current.slice(
          0, 
          sseRevealedTextRef.current.length + CHARS_PER_FRAME
        );
        needsUpdate = true;
      }
      
      if (needsUpdate && ssePlaceholderIdRef.current) {
        const pid = ssePlaceholderIdRef.current;
        const revReasoning = sseRevealedReasoningRef.current;
        const revText = sseRevealedTextRef.current;
        const isReconn = sseIsReconnectionRef.current;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMessages((prev: any[]) => prev.map(m => {
          if (m.id !== pid) return m;
          const newParts: Array<{ type: string; text?: string; isReconnecting?: boolean; isStreaming?: boolean }> = [];
          if (revReasoning) {
            newParts.push({ type: 'reasoning', text: revReasoning, isStreaming: !revText });
          }
          if (revText) {
            newParts.push({ type: 'text', text: revText });
          }
          if (isReconn) {
            newParts.push({ type: 'reconnecting', isReconnecting: true });
          }
          return { ...m, parts: newParts };
        }));
      }
      
      // Continue animation if there's more to reveal
      if (sseRevealedReasoningRef.current.length < sseTargetReasoningRef.current.length ||
          sseRevealedTextRef.current.length < sseTargetTextRef.current.length) {
        sseRevealAnimationRef.current = requestAnimationFrame(runRevealAnimation);
      } else {
        sseRevealAnimationRef.current = null;
      }
    };

    // Setup SSE connection with fetch (more reliable than EventSource)
    const abortController = new AbortController();
    sseAbortControllerRef.current = abortController;

    const connectSSE = async () => {
      try {
        const response = await fetch(`/api/generate/stream?generationId=${activeGeneration.id}`, {
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          console.error('[Reconnect] SSE connection failed:', response.status);
          setIsReconnecting(false);
          setActiveGeneration(null);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'waiting' || data.type === 'heartbeat') {
                // Waiting for generation to start - only show for reconnections
                if (isActualReconnection) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  setMessages((prev: any[]) => prev.map(m => {
                    if (m.id !== placeholderId) return m;
                    const newParts: Array<{ type: string; text?: string; isReconnecting?: boolean; isWaiting?: boolean; elapsedMs?: number }> = [];
                    newParts.push({ 
                      type: 'reconnecting', 
                      isReconnecting: true, 
                      isWaiting: true,
                      elapsedMs: data.elapsedMs || 0,
                    });
                    return { ...m, parts: newParts };
                  }));
                }
                // For fresh generations, the empty placeholder is fine (shows thinking state)
              }
              
              if (data.type === 'content') {
                // Handle incremental or full content - update target refs
                if (data.isIncremental) {
                  if (data.text) sseTargetTextRef.current += data.text;
                  if (data.reasoning) sseTargetReasoningRef.current += data.reasoning;
                } else {
                  // Full content (initial state)
                  if (data.text) sseTargetTextRef.current = data.text;
                  if (data.reasoning) sseTargetReasoningRef.current = data.reasoning;
                }
                
                // Start reveal animation if not already running
                if (!sseRevealAnimationRef.current) {
                  sseRevealAnimationRef.current = requestAnimationFrame(runRevealAnimation);
                }
              }
              
              // Handle deep search progress events
              if (data.type === 'deep-search-progress') {
                const progress = data.progress || {};
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setMessages((prev: any[]) => prev.map(m => {
                  if (m.id !== placeholderId) return m;
                  return {
                    ...m,
                    parts: [{
                      type: 'deep-research-progress',
                      progress: {
                        phase: progress.phase || 'searching',
                        phaseDescription: progress.message || 'Researching...',
                        percent: progress.percent || 0,
                        message: progress.message || '',
                      },
                    }],
                  };
                }));
              }
              
              if (data.type === 'complete') {
                console.log('[Reconnect] Generation completed');
                // Update TPS stats if available
                if (data.tokensPerSecond) {
                  setStreamingStats({
                    modelId: activeGeneration.modelId || null,
                    tokensPerSecond: parseFloat(data.tokensPerSecond) || 0,
                  });
                }
              }
              
              if (data.type === 'done') {
                console.log(`[Reconnect] SSE stream ended: ${data.reason}`);
                
                // Wait for animation to complete before reloading from DB
                // This ensures smooth reveal of remaining content
                const waitForAnimationAndReload = async () => {
                  // Check if there's still content to reveal
                  const hasMoreContent = 
                    sseRevealedTextRef.current.length < sseTargetTextRef.current.length ||
                    sseRevealedReasoningRef.current.length < sseTargetReasoningRef.current.length;
                  
                  if (hasMoreContent && sseRevealAnimationRef.current) {
                    // Wait a bit and check again (animation will continue)
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return waitForAnimationAndReload();
                  }
                  
                  // Animation complete, now cleanup and reload
                  if (sseRevealAnimationRef.current) {
                    cancelAnimationFrame(sseRevealAnimationRef.current);
                    sseRevealAnimationRef.current = null;
                  }
                  sseTargetTextRef.current = '';
                  sseTargetReasoningRef.current = '';
                  sseRevealedTextRef.current = '';
                  sseRevealedReasoningRef.current = '';
                  ssePlaceholderIdRef.current = null;
                  
                  setIsReconnecting(false);
                  setActiveGeneration(null);
                  
                  // Reload messages from DB to get the final saved version
                  if (currentChatId) {
                    try {
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
                              if (p.type === 'generated-image') return { type: 'generated-image', data: p.data, mediaType: p.mediaType };
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
                      console.error('[Reconnect] Failed to reload messages:', e);
                    }
                  }
                };
                
                // Start the wait-and-reload process
                waitForAnimationAndReload();
                return; // Exit the SSE loop
              }
              
              if (data.type === 'error') {
                console.error('[Reconnect] Generation error:', data.message);
                setIsReconnecting(false);
                setActiveGeneration(null);
                // Remove the placeholder since it failed
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setMessages((prev: any[]) => prev.filter(m => m.id !== placeholderId));
                return;
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          console.log('[Reconnect] SSE connection aborted');
          return;
        }
        console.error('[Reconnect] SSE connection error:', err);
        setIsReconnecting(false);
        setActiveGeneration(null);
      }
    };

    connectSSE();

    return () => {
      if (sseAbortControllerRef.current) {
        sseAbortControllerRef.current.abort();
        sseAbortControllerRef.current = null;
      }
      // Cleanup reveal animation
      if (sseRevealAnimationRef.current) {
        cancelAnimationFrame(sseRevealAnimationRef.current);
        sseRevealAnimationRef.current = null;
      }
    };
  }, [activeGeneration?.id, activeGeneration?.status, currentChatId, setMessages]);

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

  const stableHandleEdit = useCallback(async (index: number, newContent: string, editAttachments?: EditAttachment[]) => {
    await handleEditMessage(index, newContent, editAttachments);
    
    const chatId = chatIdRef.current;
    if (!chatId) return;
    
    // Build the edited message content
    let editedContent: unknown[];
    if (editAttachments && editAttachments.length > 0) {
      editedContent = [
        { type: 'text', text: newContent },
        ...editAttachments.map(att => ({
          type: att.mediaType.startsWith('image/') ? 'image' : 'file',
          [att.mediaType.startsWith('image/') ? 'image' : 'data']: att.url,
          mediaType: att.mediaType,
          name: att.name,
        })),
      ];
    } else {
      editedContent = [{ type: 'text', text: newContent }];
    }
    
    // Get current messages after truncation and add the edited message
    const currentMsgs = messagesRef.current;
    const allMessages = [...currentMsgs, { role: 'user', content: editedContent }];
    
    // Trigger background generation
    const bgResponse = await fetch('/api/chat/background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        messages: allMessages.map(m => ({
          role: m.role,
          content: (m as { parts?: unknown[] }).parts || (m as { content?: unknown }).content || '',
        })),
        model: currentModelIdRef.current,
        reasoningEffort: reasoningEffortRef.current,
        responseLength: responseLengthRef.current,
        userName: userNameRef.current,
        userGender: userGenderRef.current,
        learningMode: learningModeRef.current,
        customInstructions: customInstructionsRef.current,
      }),
    });
    
    if (bgResponse.ok) {
      const bgData = await bgResponse.json();
      setActiveGeneration({
        id: bgData.generationId,
        status: 'streaming',
        modelId: currentModelIdRef.current,
      });
    }
  }, [handleEditMessage]);

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
          body: JSON.stringify({ title: null, mode: chatModeRef.current }) 
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

      // Handle deep search mode differently
      if (chatModeRef.current === 'deep-search') {
        console.log(`[CLIENT DEBUG] ${new Date().toISOString()} === CALLING DEEP SEARCH ===`);
        console.log(`[CLIENT DEBUG] ChatId: ${activeChatId}`);
        
        // First, add the user message to UI immediately (fix: query not showing)
        const userMsgId = `user-${Date.now()}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMessages((prev: any) => [...prev, {
          id: userMsgId,
          role: 'user',
          parts: Array.isArray(finalContent) 
            ? finalContent 
            : [{ type: 'text', text: finalContent as string }],
        }]);
        
        // Add a placeholder assistant message with research indicator
        const placeholderId = `deep-search-${Date.now()}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMessages((prev: any) => [...prev, {
          id: placeholderId,
          role: 'assistant',
          parts: [{ type: 'deep-research-progress', progress: { 
            phase: 'planning', 
            phaseDescription: 'Starting research...',
            percent: 0,
            message: 'Initializing',
            searches: [],
            sources: [],
            isComplete: false
          }}],
        }]);
        
        // Start deep search
        await startDeepSearch(userMessage, activeChatId, placeholderId, false);
        return;
      }

      // Use background generation via Inngest for reliable generation
      // This allows generation to continue even if user closes the tab
      console.log(`[CLIENT DEBUG] ${new Date().toISOString()} === STARTING BACKGROUND GENERATION ===`);
      console.log(`[CLIENT DEBUG] Model: ${currentModelIdRef.current}, ChatId: ${activeChatId}`);
      
      // Add user message to UI immediately
      const userMsgId = `user-${Date.now()}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMessages((prev: any) => [...prev, {
        id: userMsgId,
        role: 'user',
        parts: Array.isArray(finalContent) 
          ? finalContent 
          : [{ type: 'text', text: finalContent as string }],
      }]);
      
      // Prepare messages for background API (include all conversation history)
      const allMessages = [...messagesRef.current, {
        role: 'user',
        content: Array.isArray(finalContent) ? finalContent : [{ type: 'text', text: finalContent }],
      }];
      
      // Trigger background generation via Inngest
      const bgResponse = await fetch('/api/chat/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChatId,
          messages: allMessages.map(m => ({
            role: m.role,
            content: (m as { parts?: unknown[] }).parts || (m as { content?: unknown }).content || '',
          })),
          model: currentModelIdRef.current,
          reasoningEffort: reasoningEffortRef.current,
          responseLength: responseLengthRef.current,
          userName: userNameRef.current,
          userGender: userGenderRef.current,
          learningMode: learningModeRef.current,
          customInstructions: customInstructionsRef.current,
        }),
      });
      
      if (!bgResponse.ok) {
        const errorText = await bgResponse.text();
        console.error('[CLIENT DEBUG] Background generation failed to start:', bgResponse.status, errorText);
        setIsSending(false);
        return;
      }
      
      const bgData = await bgResponse.json();
      console.log(`[CLIENT DEBUG] Background generation started: ${bgData.generationId}`);
      
      // Add a placeholder assistant message that will be updated by SSE
      const assistantPlaceholderId = `assistant-${bgData.generationId}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMessages((prev: any) => [...prev, {
        id: assistantPlaceholderId,
        role: 'assistant',
        parts: [{ type: 'text', text: '' }], // Empty initially, will be filled by SSE
        model: currentModelIdRef.current,
      }]);
      
      // Set active generation - this will trigger SSE streaming
      setActiveGeneration({
        id: bgData.generationId,
        status: 'streaming',
        modelId: currentModelIdRef.current,
        partialText: '',
        partialReasoning: '',
      });
      
      setIsSending(false);
    } catch (err) {
      console.error("[CLIENT DEBUG] Failed to send message:", err);
      setIsSending(false);
    }
  }, [input, attachments, hasPendingAttachments, currentChatId, clearAttachments, refreshChats, sendMessage]);

  const handleModelChange = useCallback((id: string, name: string) => {
    setCurrentModelId(id);
    setCurrentModelName(name);
  }, [setCurrentModelId, setCurrentModelName]);

  const handleChatModeChange = useCallback((mode: ChatMode) => {
    setChatMode(mode);
    // Note: setChatMode already syncs learningMode internally
  }, [setChatMode]);

  const handleRetry = useCallback(() => {
    isRegeneratingRef.current = true;
    regenerate();
  }, [regenerate]);

  return (
    <div className="flex h-full w-full bg-[var(--bg-main)] text-[var(--text-primary)] relative">
      <ChatBackground />
      <main className="flex-1 flex flex-col h-full min-h-0 relative z-10">
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
          customInstructions={customInstructions}
          onCustomInstructionsChange={setCustomInstructions}
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
          isStreaming={isStreaming || activeGeneration?.status === 'streaming'}
          status={status}
          activeGeneration={activeGeneration}
          streamingStats={streamingStats}
          currentChatId={currentChatId}
          chatMode={chats.find(c => c.id === currentChatId)?.mode as ChatMode || chatMode}
          error={error}
          onEdit={stableHandleEdit}
          onRetry={handleRetry}
          onDismissError={() => setDismissedError(true)}
          dismissedError={dismissedError}
          onSuggestionClick={setInput}
          onClarifySubmit={handleClarifySubmit}
          onSkipClarify={handleSkipClarify}
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
          chatMode={chatMode}
          onChatModeChange={handleChatModeChange}
          chatId={currentChatId}
        />
      </main>
    </div>
  );
}
