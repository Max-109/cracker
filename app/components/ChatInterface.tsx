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
import { EnhancedChatInput } from './EnhancedChatInput';
import { MessageList } from './MessageList';
import { QuoteProvider, useQuoteContext } from './QuoteContext';
import { SettingsDialog } from './SettingsDialog';
import { ChatBackground } from './ChatBackground';

interface ChatInterfaceProps {
  initialChatId?: string;
}

type EditAttachment = { id: string; url: string; name: string; mediaType: string };

export default function ChatInterface({ initialChatId }: ChatInterfaceProps) {
  const { refreshChats, toggleSidebar, chats } = useChatContext();

  // Settings
  const [currentModelId, setCurrentModelId, isModelIdHydrated] = usePersistedSetting('CHATGPT_MODEL_ID', "gemini-3-pro-preview");
  const [currentModelName, setCurrentModelName, isModelNameHydrated] = usePersistedSetting('CHATGPT_MODEL_NAME', "Expert");
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
      // When image mode is selected, use the image generation model
      model: chatModeRef.current === 'image' ? 'gemini-3-pro-image-preview' : currentModelIdRef.current,
      reasoningEffort: reasoningEffortRef.current,
      chatId: chatIdRef.current,
      responseLength: responseLengthRef.current,
      imageMode: chatModeRef.current === 'image',
      userName: userNameRef.current,
      userGender: userGenderRef.current,
      learningMode: learningModeRef.current,
      customInstructions: customInstructionsRef.current,
    }),
  }), []);

  // useChat hook
  const chatHelpers = useChat({
    transport,
    experimental_throttle: 16, // ~60fps for smoother streaming
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
          // Small delay to ensure backend has saved the message with TPS
          await new Promise(resolve => setTimeout(resolve, 50));
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
  const isLoading = isStreaming || deepResearchState.isActive;

  // Handle stop - just stop the streaming
  const handleStop = useCallback(() => {
    stop();
    setIsSending(false);
  }, [stop]);

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
      // Add error message to UI
      setMessages(prev => {
        const updated = prev.map(m =>
          m.id === placeholderId
            ? {
                ...m,
                parts: [{
                  type: 'text' as const,
                  text: `Deep research failed: ${err instanceof Error ? err.message : String(err)}`
                }]
              }
            : m
        );
        return updated;
      });
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
    } else {
      setMessages([]);
      setIsMessagesLoading(false);
    }
  }, [currentChatId, setMessages]);

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
    
    // Use direct streaming - the transport body() provides model, chatId, etc.
    // For multimodal content (with attachments), use AI SDK's file format for BOTH images and files
    // Vertex AI only accepts the 'file' type format: { type: 'file', filename, mediaType, url }
    if (editAttachments && editAttachments.length > 0) {
      const aiParts = editedContent.map(part => {
        const p = part as { type: string; text?: string; image?: string; data?: string; mediaType?: string; mimeType?: string; name?: string };
        if (p.type === 'text') {
          return { type: 'text' as const, text: p.text || '' };
        }
        if (p.type === 'image') {
          // Vertex AI requires 'file' format even for images!
          return { 
            type: 'file' as const, 
            filename: p.name || 'image.png',
            mediaType: p.mediaType || 'image/png',
            url: p.image || '' // 'image' contains the data URL
          };
        }
        if (p.type === 'file') {
          // AI SDK expects: { type: 'file', filename, mediaType, url }
          return { 
            type: 'file' as const, 
            filename: p.name || 'file',
            mediaType: p.mediaType || p.mimeType || 'application/octet-stream',
            url: p.data || p.image || '' // data URL
          };
        }
        return { type: 'text' as const, text: '' };
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sendMessage({ role: 'user', parts: aiParts } as any);
    } else {
      await sendMessage({ text: newContent });
    }
  }, [handleEditMessage, sendMessage]);

  // Handle send message
  const handleSendMessage = useCallback(async (quotes?: { id: string; text: string; source: string }[]) => {
    if (!input.trim() && attachments.length === 0) return;
    if (hasPendingAttachments) {
      console.warn('Attachments are still uploading.');
      return;
    }

    // Show immediate loading feedback
    setIsSending(true);
    
    // Format message with quotes if any
    let userMessage = input;
    if (quotes && quotes.length > 0) {
      const quotedSection = quotes.map(q => `> "${q.text}"`).join('\n\n');
      userMessage = `[QUOTED FROM CONVERSATION]\n${quotedSection}\n[END QUOTE]\n\n${input}`;
    }
    
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

      // Use direct streaming via sendMessage - transport body() provides model, chatId, etc.
      // For multimodal content (with attachments), use AI SDK's file format for BOTH images and files
      // Vertex AI only accepts the 'file' type format: { type: 'file', filename, mediaType, url }
      if (Array.isArray(finalContent)) {
        // Convert to AI SDK UIMessage format for multimodal content
        const aiParts = finalContent.map(part => {
          if (part.type === 'text') {
            return { type: 'text' as const, text: part.text };
          }
          if (part.type === 'image') {
            // Vertex AI requires 'file' format even for images!
            // { type: 'image', image: dataUrl } does NOT work with Vertex AI
            return { 
              type: 'file' as const, 
              filename: part.name || 'image.png',
              mediaType: part.mediaType || 'image/png',
              url: part.image // 'image' contains the data URL
            };
          }
          if (part.type === 'file') {
            // AI SDK expects: { type: 'file', filename, mediaType, url }
            // Our 'data' property contains the full data URL
            return { 
              type: 'file' as const, 
              filename: part.filename || part.name || 'file',
              mediaType: part.mediaType || part.mimeType || 'application/octet-stream',
              url: part.data // 'data' contains the data URL from FileReader
            };
          }
          return { type: 'text' as const, text: '' };
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await sendMessage({ role: 'user', parts: aiParts } as any);
      } else {
        await sendMessage({ text: finalContent });
      }
      
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

        <QuoteProvider>
          {/* Messages - this container can have overflow hidden */}
          <MessageList
            messages={typedMessages}
            isMessagesLoading={isMessagesLoading}
            isSending={isSending}
            isStreaming={isStreaming}
            status={status}
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
          <EnhancedChatInput
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
        </QuoteProvider>
      </main>
    </div>
  );
}
