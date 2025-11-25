'use client';

import React, { memo, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import type { ChatMessage, MessagePart } from '@/lib/chat-types';
import { MessageItem } from './MessageItem';
import { Skeleton } from './Skeleton';
import { LoadingIndicator } from './LoadingIndicator';
import { HexColorPicker } from "react-colorful";
import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, ChevronDown, PanelLeft, Square, Check, Sparkles, X, File as FileIcon } from 'lucide-react';
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
                "bg-[var(--bg-sidebar)] border border-[var(--border-color)] p-6 w-[90%] max-w-md transition-all duration-200 transform",
                isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
            )}>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Set Custom Model ID</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">Enter the full OpenRouter model ID (e.g., openai/gpt-oss-120b:exacto).</p>
                <input
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)] mb-6 tracking-tight"
                    placeholder="openai/gpt-oss-120b:exacto"
                    autoFocus
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-[var(--text-primary)] border border-[var(--border-color)] hover-glow transition-colors uppercase tracking-[0.12em] text-xs">Cancel</button>
                    <button onClick={() => onSubmit(val)} className="px-4 py-2 bg-[var(--text-accent)] text-black border border-[var(--text-accent)] hover:bg-black hover:text-[var(--text-accent)] hover-glow font-semibold transition-colors uppercase tracking-[0.12em] text-xs">Save</button>
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
        let timeout: NodeJS.Timeout;
        if (show) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShouldRender(true);
            // Small delay to allow render before transition
            requestAnimationFrame(() => setIsFadingIn(true));
        } else {
            setIsFadingIn(false);
            timeout = setTimeout(() => setShouldRender(false), 300); // Match duration
        }
        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [show]);

    if (!shouldRender) return null;

    return (
        <div className={cn("transition-opacity duration-300", isFadingIn ? "opacity-100" : "opacity-0", className)}>
            {children}
        </div>
    );
}

function hexToHSL(hex: string): { h: number, s: number, l: number } | null {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt("0x" + hex[1] + hex[1]);
        g = parseInt("0x" + hex[2] + hex[2]);
        b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
        r = parseInt("0x" + hex[1] + hex[2]);
        g = parseInt("0x" + hex[3] + hex[4]);
        b = parseInt("0x" + hex[5] + hex[6]);
    } else {
        return null;
    }

    r /= 255;
    g /= 255;
    b /= 255;
    const cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin;
    let h = 0,
        s = 0,
        l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return { h, s, l };
}

interface ChatInterfaceProps {
    initialChatId?: string;
}

type ReasoningEffortLevel = 'low' | 'medium' | 'high';

const isBrowser = typeof window !== 'undefined';
const generateId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function usePersistedSetting(key: string, fallback: string) {
    const [value, setValue] = useState(fallback);

    useEffect(() => {
        if (!isBrowser) return;
        const stored = window.localStorage.getItem(key);
        if (stored !== null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setValue(stored);
        }
    }, [key]);

    const updateValue = React.useCallback((nextValue: React.SetStateAction<string>) => {
        setValue(prev => {
            const resolved = typeof nextValue === 'function'
                ? (nextValue as (val: string) => string)(prev)
                : nextValue;
            if (isBrowser) {
                window.localStorage.setItem(key, resolved);
            }
            return resolved;
        });
    }, [key]);

    return [value, updateValue] as const;
}

type AttachmentItem = {
    id: string;
    file: File;
    name: string;
    mediaType: string;
    dataUrl?: string;
    previewUrl?: string;
    progress: number;
    isUploading: boolean;
    error?: string;
};

// Custom hook for throttling values
function useThrottledValue<T>(value: T, limit: number): T {
    const [throttledValue, setThrottledValue] = useState(value);
    const lastRanRef = useRef<number>(0);

    useEffect(() => {
        const now = Date.now();

        if (lastRanRef.current === 0) {
            lastRanRef.current = now;
            return;
        }

        const elapsed = now - lastRanRef.current;
        const delay = Math.max(limit - elapsed, 0);

        const handler = window.setTimeout(() => {
            setThrottledValue(value);
            lastRanRef.current = Date.now();
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, limit]);

    return throttledValue;
}

const ThrottledMessageItem = memo(function ThrottledMessageItem({ message, index, isThinking, onEdit, onRetry }: { message: ChatMessage, index: number, isThinking: boolean, onEdit: (index: number, content: string) => void, onRetry: () => void }) {
    // We use useThrottledValue to limit how often the expensive Markdown component re-renders.
    // This prevents the UI from freezing during high-speed streaming of complex content (tables, code).
    // 100ms throttle = ~10fps updates, which feels smooth but saves massive resources.
    const combinedContent: ChatMessage['content'] = Array.isArray(message.content)
        ? message.content
        : (Array.isArray(message.parts) ? message.parts : (message.content ?? ''));

    // Only throttle if it's an AI message that is currently streaming (implied by updates)
    // For user messages or static content, it doesn't matter as much, but consistency is good.
    // We use 100ms as a balance between responsiveness and performance.
    const throttledContent = useThrottledValue(combinedContent, 100);

    // Create a stable handler for this specific item
    const handleEdit = React.useCallback((newContent: string) => {
        onEdit(index, newContent);
    }, [onEdit, index]);

    return <MessageItem role={message.role} content={throttledContent} isThinking={isThinking} onEdit={handleEdit} onRetry={onRetry} />;
});

export default function ChatInterface({ initialChatId }: ChatInterfaceProps) {
    const router = useRouter();
    const { refreshChats, toggleSidebar } = useChatContext();

    // User Settings State with LocalStorage Persistence
    const [currentModelId, setCurrentModelId] = usePersistedSetting('CHATGPT_MODEL_ID', "x-ai/grok-4.1-fast");
    const [currentModelName, setCurrentModelName] = usePersistedSetting('CHATGPT_MODEL_NAME', "Smart");
    const [rawReasoningEffort, setRawReasoningEffort] = usePersistedSetting('CHATGPT_REASONING_EFFORT', "medium");
    const [accentColor, setAccentColor] = usePersistedSetting('CHATGPT_ACCENT_COLOR', '#7dcc3c');
    const reasoningEffort = (rawReasoningEffort as ReasoningEffortLevel) ?? 'medium';
    const setReasoningEffort = React.useCallback((value: ReasoningEffortLevel) => {
        setRawReasoningEffort(value);
    }, [setRawReasoningEffort]);
    const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);

    // Apply Accent Color
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--text-accent', accentColor);
        root.style.setProperty('--border-active', accentColor);
        root.style.setProperty('--primary', accentColor);
        root.style.setProperty('--accent-foreground', accentColor);
        root.style.setProperty('--ring', accentColor);
        root.style.setProperty('--chart-1', accentColor);
        // Also update thinking loader variables
        const hsl = hexToHSL(accentColor);
        if (hsl) {
            root.style.setProperty('--accent-h', hsl.h.toString());
            root.style.setProperty('--accent-s', `${hsl.s}%`);
            root.style.setProperty('--accent-l', `${hsl.l}%`);
        }

        // Update Favicon dynamically to match icon.svg structure with accent color
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 291 291">
            <rect x="3.252" y="3.252" width="283.465" height="283.465" rx="60" ry="60" 
                style="fill:#262626;stroke:#7c7c7c;stroke-width:6.5px;"/>
            <circle cx="144.985" cy="144.985" r="70.866" 
                style="fill:${accentColor};stroke:#7c7c7c;stroke-width:6.5px;"/>
        </svg>`;
        const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        
        // Remove all existing icon links to ensure clean replacement
        document.querySelectorAll("link[rel*='icon']").forEach(link => link.remove());
        
        // Create new favicon link
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        link.href = dataUrl;
        document.head.appendChild(link);

    }, [accentColor]);

    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
    const [isEffortMenuOpen, setIsEffortMenuOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const updateAttachment = React.useCallback((id: string, updater: (prev: AttachmentItem) => AttachmentItem) => {
        setAttachments(prev => prev.map(att => att.id === id ? updater(att) : att));
    }, []);

    const [currentChatId, setCurrentChatId] = useState<string | null>(initialChatId || null);
    const chatIdRef = useRef<string | null>(initialChatId || null);

    // Ref to track latest messages for persistence fallback
    const messagesRef = useRef<ChatMessage[]>([]);
    const currentModelIdRef = useRef(currentModelId);
    const reasoningEffortRef = useRef(reasoningEffort);

    useEffect(() => {
        currentModelIdRef.current = currentModelId;
    }, [currentModelId]);

    useEffect(() => {
        reasoningEffortRef.current = reasoningEffort;
    }, [reasoningEffort]);

    // Loading states
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);

    // Ref to prevent double-loading messages when we just created a chat locally
    const ignoreNextChatIdChangeRef = useRef(false);

    // Sync state and ref when prop changes or internal navigation happens
    useEffect(() => {
        // Always update state, whether it's a new ID or null (new chat)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentChatId(initialChatId || null);
        chatIdRef.current = initialChatId || null;
    }, [initialChatId]);
    
    // Memoize chat config to avoid recreating on every render
    const chatConfig = useMemo(() => ({
        api: '/api/chat',
        body: {
            model: currentModelId,
            reasoningEffort: reasoningEffort
        },
        initialMessages: [],
        onError: (err: Error) => {
            console.error("Chat Error:", err);
        },
        onFinish: async (result: unknown) => {
            // Handle both new (object wrapper) and old (direct message) signatures
            const messageCandidate = (typeof result === 'object' && result && 'message' in (result as Record<string, unknown>))
                ? (result as { message: unknown }).message
                : result;
            const message = messageCandidate as Partial<ChatMessage> & { parts?: MessagePart[] };
            // Use ref to ensure we have the latest ID even if closure is stale
            const activeId = chatIdRef.current;
            if (activeId) {
                // Determine the actual content to save. 
                // We prefer saving 'parts' (JSON) if available to preserve structured "thinking" blocks vs final content.
                let contentToSave: unknown = null;

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
    }), [currentModelId, reasoningEffort]);
    
    const chatHelpers = useChat(chatConfig);

    // @ts-expect-error - status might be present instead of isLoading in newer versions
    const { messages, isLoading: originalIsLoading, status, stop, setMessages, regenerate } = chatHelpers;
    const typedMessages = messages as unknown as ChatMessage[];

    // Polyfill isLoading if it's missing, based on status
    const isLoading = originalIsLoading ?? (status === 'submitted' || status === 'streaming');

    const fallbackAppend = (chatHelpers as Record<string, unknown>)['append'] as typeof chatHelpers.sendMessage | undefined;
    const sendMessage = chatHelpers.sendMessage ?? fallbackAppend;
    const invokeSendMessage = React.useCallback(async (message: { role: string; content: unknown }, options?: Record<string, unknown>) => {
        if (!sendMessage) return;
        const fn = sendMessage as unknown as (msg: { role: string; content: unknown }, opts?: Record<string, unknown>) => Promise<void>;
        await fn(message, options);
    }, [sendMessage]);

    // Sync messages ref whenever messages update
    useEffect(() => {
        messagesRef.current = typedMessages;
    }, [typedMessages]);

    // Load messages when chat ID changes
    useEffect(() => {
        if (currentChatId) {
            // If we just created this chat locally, don't overwrite the optimistic state from useChat
            if (ignoreNextChatIdChangeRef.current) {
                ignoreNextChatIdChangeRef.current = false;
                return;
            }

            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsMessagesLoading(true);
            fetch(`/api/chats/${currentChatId}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        // Map DB messages to UI format
                        const uiMessages: ChatMessage[] = data.map((msg: { id: string; role: 'user' | 'assistant'; content: string | unknown[]; createdAt: string }) => {
                            const isParts = Array.isArray(msg.content);
                            return {
                                id: msg.id,
                                role: msg.role,
                                // If it's an array (parts), we put it in 'parts' and leave content empty/stringified.
                                // However, MessageItem uses (content || parts), so we need to ensure 'parts' is set if it's an array.
                                content: isParts ? "" : (msg.content as string),
                                parts: isParts ? (msg.content as MessagePart[]) : undefined,
                                createdAt: new Date(msg.createdAt)
                            };
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

    // Handle Message Edit - Stable reference using Ref to avoid re-creating on every render
    const handleEditMessage = React.useCallback(async (index: number, newContent: string) => {
        const currentMessages = messagesRef.current;
        const currentChatId = chatIdRef.current;
        if (!currentChatId) return;

        try {
            // 1. Sync with DB: Truncate history (Delete edited message + all subsequent)
            const messagesToDeleteCount = currentMessages.length - index;
            await fetch('/api/chat/truncate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: currentChatId,
                    count: messagesToDeleteCount
                })
            });

            // 2. Update Local State (Remove edited + subsequent)
            const keptMessages = currentMessages.slice(0, index);
            setMessages(keptMessages as Parameters<typeof setMessages>[0]);

            // 3. Save NEW user message to DB
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: currentChatId,
                    role: 'user',
                    content: newContent
                })
            });

            // 4. Send new message (triggers generation)
            // Actual send occurs outside to maintain stable callback references.
        } catch (err) {
            console.error("Failed to edit message:", err);
        }
    }, [setMessages]); // setMessages is stable from useChat

    // Actual implementation that calls the ref
    const stableHandleEdit = React.useCallback((index: number, newContent: string) => {
        handleEditMessage(index, newContent).then(() => {
            const modelOverride = currentModelIdRef.current || "x-ai/grok-4.1-fast";
            const effortOverride = reasoningEffortRef.current || "medium";

            invokeSendMessage({
                role: 'user',
                content: newContent
            }, {
                body: {
                    model: modelOverride,
                    reasoningEffort: effortOverride
                }
            });
        });
    }, [handleEditMessage, invokeSendMessage]);

    // Handle scroll events to determine if we should stick to bottom
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // If user is within threshold of bottom, enable auto-scroll.
        // We use a much larger threshold (200px) during loading to ensure we stick to bottom even if stream is fast.
        // For normal browsing, 100px is sufficient.
        const threshold = isLoading ? 200 : 100;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;
        setShouldAutoScroll(isAtBottom);
    };

    // Auto-scroll effect (Moved after messages definition)
    useEffect(() => {
        if (shouldAutoScroll && scrollContainerRef.current) {
            const { scrollHeight, clientHeight } = scrollContainerRef.current;
            scrollContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: "smooth"
            });
        }
    }, [typedMessages, shouldAutoScroll]);

    const [input, setInput] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    const readFileWithProgress = React.useCallback((file: File, onProgress: (percent: number) => void): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    onProgress(percent);
                }
            };
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    }, []);

    const inferMediaType = (file: File): string => {
        if (file.type) return file.type;
        const extension = file.name.split('.').pop()?.toLowerCase();
        const fallbackMap: Record<string, string> = {
            pdf: 'application/pdf',
            txt: 'text/plain',
            md: 'text/markdown',
            json: 'application/json',
            csv: 'text/csv',
            yml: 'text/yaml',
            yaml: 'text/yaml',
            html: 'text/html',
            css: 'text/css',
            js: 'application/javascript',
            ts: 'text/typescript',
            tsx: 'text/typescript',
            jsx: 'text/jsx',
            py: 'text/x-python',
            java: 'text/x-java-source',
            c: 'text/x-c',
            cpp: 'text/x-c++',
            sql: 'application/sql',
            ico: 'image/x-icon',
            svg: 'image/svg+xml'
        };
        if (extension && fallbackMap[extension]) {
            return fallbackMap[extension];
        }
        return 'application/octet-stream';
    };

    const handleFileSelect = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const selectedFiles = Array.from(e.target.files);

        const newAttachments = selectedFiles.map((file) => ({
            id: generateId(),
            file,
            name: file.name,
            mediaType: inferMediaType(file),
            progress: 0,
            isUploading: true
        } satisfies AttachmentItem));

        setAttachments(prev => [...prev, ...newAttachments]);

        newAttachments.forEach((attachment) => {
            readFileWithProgress(attachment.file, (percent) => {
                updateAttachment(attachment.id, (prev) => ({ ...prev, progress: percent }));
            }).then((dataUrl) => {
                updateAttachment(attachment.id, (prev) => ({
                    ...prev,
                    dataUrl,
                    previewUrl: prev.mediaType.startsWith('image/') ? dataUrl : prev.previewUrl,
                    isUploading: false,
                    progress: 100,
                }));
            }).catch(() => {
                updateAttachment(attachment.id, (prev) => ({
                    ...prev,
                    isUploading: false,
                    error: 'Failed to load file'
                }));
            });
        });

        // Reset input so same file can be selected again if needed
        e.target.value = '';
    }, [readFileWithProgress, updateAttachment]);

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(att => att.id !== id));
    };

    const hasPendingAttachments = attachments.some(att => att.isUploading || !att.dataUrl);

    const handleSendMessage = async () => {
        if (!input.trim() && attachments.length === 0) return;

        const userMessage = input;
        if (hasPendingAttachments) {
            console.warn('Attachments are still uploading. Please wait before sending.');
            return;
        }

        // Convert attachments to base64
        type PreparedAttachment =
            | { type: 'image'; name: string; image: string; mediaType: string }
            | { type: 'file'; name: string; data: string; mediaType: string; mimeType: string; filename?: string };

        const processedAttachments: PreparedAttachment[] = attachments.length > 0
            ? attachments.reduce<PreparedAttachment[]>((acc, attachment) => {
                if (!attachment.dataUrl) return acc;
                if (attachment.mediaType.startsWith('image/')) {
                    acc.push({
                        name: attachment.name,
                        type: 'image',
                        image: attachment.dataUrl,
                        mediaType: attachment.mediaType
                    });
                } else {
                    acc.push({
                        name: attachment.name,
                        type: 'file',
                        data: attachment.dataUrl,
                        mediaType: attachment.mediaType,
                        mimeType: attachment.mediaType,
                        filename: attachment.name
                    });
                }
                return acc;
            }, [])
            : [];

        setInput(''); // Clear input immediately
        setAttachments([]); // Clear attachments
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
                    router.push(`/chat/${newChat.id}`);
                }
            }

            // Construct Message Content (Multimodal or Text)
            let finalContent: string | MessagePart[] = userMessage;

            // If we have attachments, format for Vercel AI SDK (experimental_attachments) or mixed content
            // Since AI SDK `append` supports mixed content (text + images), we construct that.
            if (processedAttachments.length > 0) {
                // Structure for Vercel AI SDK 'user' message with mixed content
                const structuredParts: MessagePart[] = [
                    { type: 'text', text: userMessage },
                    ...processedAttachments.map(att => {
                        if (att.type === 'image') {
                            return { type: 'image', image: att.image, mediaType: att.mediaType, name: att.name } satisfies MessagePart;
                        }
                        return {
                            type: 'file',
                            data: att.data,
                            mediaType: att.mediaType,
                            mimeType: att.mimeType,
                            filename: att.filename || att.name,
                            name: att.name
                        } satisfies MessagePart;
                    })
                ];
                finalContent = structuredParts;
            }

            // Save User Message (store as JSON if multimodal)
            if (activeChatId) {
                await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chatId: activeChatId,
                        role: 'user',
                        content: finalContent // Pass the structured object/string directly
                    })
                });

                // Generate Title if new chat (use text only)
                if (isNewChat) {
                    fetch('/api/generate-title', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chatId: activeChatId, prompt: userMessage })
                    }).then(() => refreshChats());
                }
            }

            if (!activeChatId) {
                console.error("Failed to create or retrieve chat ID. Aborting message send.");
                return;
            }

            // Send to AI SDK
            // Note: sendMessage() automatically handles the optimistic UI update
            await invokeSendMessage({
                role: 'user',
                content: finalContent,
            }, {
                body: {
                    model: currentModelId,
                    reasoningEffort: reasoningEffort
                }
            });

        } catch (err) {
            console.error("Failed to send message:", err);
        }
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
        setCurrentModelName(name); // Fix: Update the name state!
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
                <div className="absolute top-0 left-0 w-full h-14 flex items-center justify-between px-4 z-50 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-2 md:hidden">
                        <button
                            onClick={toggleSidebar}
                            className="px-2 py-1 border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-active)]"
                            aria-label="Toggle sidebar"
                        >
                            <PanelLeft size={20} />
                        </button>
                    </div>

                    {/* Model Selector & Color Picker */}
                    <div className="flex items-center gap-2 ml-auto md:ml-0 md:mr-auto">
                        <div className="relative">
                            <button
                                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                                className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] px-3 py-2 border border-[var(--border-color)] hover-glow uppercase tracking-[0.16em]"
                            >
                                <span>{currentModelName}</span>
                                <ChevronDown size={16} className="text-[var(--text-secondary)]" />
                            </button>

                            {isModelMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsModelMenuOpen(false)}></div>
                                    <div className="absolute top-full right-0 md:left-0 md:right-auto mt-1 w-[240px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] overflow-hidden z-20 p-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right md:origin-top-left">
                                        <div className="px-2 py-2 text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">Select Model</div>

                                        <button
                                            onClick={() => { setCurrentModelId("x-ai/grok-4.1-fast"); setCurrentModelName("Smart"); setIsModelMenuOpen(false); }}
                                            className="flex items-center justify-between w-full text-left px-3 py-2 hover:bg-[#0a0a0a] text-sm transition-colors border border-transparent"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-[var(--text-primary)] font-semibold uppercase tracking-[0.12em]">Smart</span>
                                                <span className="text-[var(--text-secondary)] text-[11px]">Grok 4.1 Fast</span>
                                            </div>
                                            {currentModelId === "x-ai/grok-4.1-fast" && <Check size={16} />}
                                        </button>

                                        <button
                                            onClick={() => { setCurrentModelId("openai/gpt-oss-safeguard-20b"); setCurrentModelName("Ultra-Fast"); setIsModelMenuOpen(false); }}
                                            className="flex items-center justify-between w-full text-left px-3 py-2 hover:bg-[#0a0a0a] text-sm transition-colors border border-transparent"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-[var(--text-primary)] font-semibold uppercase tracking-[0.12em]">Ultra-Fast</span>
                                                <span className="text-[var(--text-secondary)] text-[11px]">GPT OSS 20B</span>
                                            </div>
                                            {currentModelId === "openai/gpt-oss-safeguard-20b" && <Check size={16} />}
                                        </button>

                                        <button
                                            onClick={() => { setCurrentModelId("deepseek/deepseek-r1-distill-llama-70b"); setCurrentModelName("Chinese"); setIsModelMenuOpen(false); }}
                                            className="flex items-center justify-between w-full text-left px-3 py-2 hover:bg-[#0a0a0a] text-sm transition-colors border border-transparent"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-[var(--text-primary)] font-semibold uppercase tracking-[0.12em]">Chinese</span>
                                                <span className="text-[var(--text-secondary)] text-[11px]">DeepSeek R1 Distill</span>
                                            </div>
                                            {currentModelId === "deepseek/deepseek-r1-distill-llama-70b" && <Check size={16} />}
                                        </button>

                                        <div className="my-1 border-t border-[var(--border-color)]"></div>

                                        <button
                                            onClick={() => { setCurrentModelId("openrouter/auto"); setCurrentModelName("Auto (Best)"); setIsModelMenuOpen(false); }}
                                            className="flex items-center justify-between w-full text-left px-3 py-2 hover:bg-[#0a0a0a] text-sm transition-colors border border-transparent"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-[var(--text-primary)] font-semibold uppercase tracking-[0.12em]">Auto (Best)</span>
                                                <span className="text-[var(--text-secondary)] text-[11px]">OpenRouter Auto</span>
                                            </div>
                                            {currentModelId === "openrouter/auto" && <Check size={16} />}
                                        </button>

                                        <div className="my-1 border-t border-[var(--border-color)]"></div>

                                        <button
                                            onClick={() => { setIsModelMenuOpen(false); setIsCustomDialogOpen(true); }}
                                            className="flex items-center justify-between w-full text-left px-3 py-2 hover:bg-[#0a0a0a] text-sm transition-colors border border-transparent"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-[var(--text-primary)] font-semibold uppercase tracking-[0.12em]">Custom Model</span>
                                                <span className="text-[var(--text-secondary)] text-[11px]">Enter ID manually</span>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Color Picker */}
                        <div className="relative">
                            <button
                                onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
                                className="w-9 h-9 border border-[var(--border-color)] bg-[#050505] hover-glow flex items-center justify-center"
                                title="Accent Color"
                            >
                                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: accentColor }}></div>
                            </button>

                            {isColorMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsColorMenuOpen(false)}></div>
                                    <div className="absolute top-full right-0 md:right-[-60px] mt-1 p-3 bg-[var(--bg-sidebar)] border border-[var(--border-color)] shadow-xl z-20 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                        <HexColorPicker color={accentColor} onChange={setAccentColor} />
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="text-[10px] uppercase text-[var(--text-secondary)] font-mono">HEX</span>
                                            <input
                                                type="text"
                                                value={accentColor}
                                                onChange={(e) => setAccentColor(e.target.value)}
                                                className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] text-[11px] px-2 py-1 text-[var(--text-primary)] font-mono uppercase focus:border-[var(--border-active)] outline-none"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setAccentColor('#7dcc3c')}
                                            className="mt-2 w-full px-2 py-1 text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--border-active)] transition-colors"
                                        >
                                            Reset to Default
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className="flex-1 overflow-y-auto scroll-smooth"
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                >
                    <div className="max-w-[800px] mx-auto pt-20 pb-40 px-4 md:px-6 relative">

                        {/* Loading Skeletons - Smart & Smooth */}
                        <FadeWrapper show={isMessagesLoading} className="absolute inset-0 pt-20 px-4 md:px-6 z-10">
                            <div className="space-y-10">
                                {/* User message skeleton - Randomized widths */}
                                <div className="flex justify-end">
                                    <Skeleton className="h-12 w-[60%]" />
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
                                    <Skeleton className="h-10 w-[40%]" />
                                </div>
                            </div>
                        </FadeWrapper>

                        {/* Actual Content */}
                        <FadeWrapper show={!isMessagesLoading} className="relative z-0">
                            <>
                                {typedMessages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-100">
                                        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Where should we begin?</h2>
                                    </div>
                                )}

                                {typedMessages.map((m: ChatMessage, index: number) => (
                                    <ThrottledMessageItem
                                        key={m.id}
                                        message={m}
                                        index={index}
                                        isThinking={isLoading && index === typedMessages.length - 1 && m.role === 'assistant'}
                                        onEdit={stableHandleEdit}
                                        onRetry={() => regenerate()}
                                    />
                                ))}

                                {isLoading && (
                                    <div className="mt-8 border-t border-[var(--border-color)] pt-4">
                                        <LoadingIndicator label="processing" />
                                    </div>
                                )}
                            </>
                        </FadeWrapper>

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 w-full bg-[var(--bg-main)] border-t border-[var(--border-color)] pt-6 pb-5">
                    <div className="max-w-[900px] mx-auto px-4 space-y-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            multiple
                        />

                        {/* Attachments Preview */}
        {attachments.length > 0 && (
            <div className="flex gap-3 overflow-x-auto px-1 py-1">
                {attachments.map((attachment) => (
                    <div key={attachment.id} className="relative group flex-shrink-0 w-16 h-16 bg-[#050505] border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                        <div className="scanline-overlay z-10"></div>
                        {attachment.mediaType.startsWith('image/') && attachment.previewUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={attachment.previewUrl}
                                alt={attachment.name}
                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center w-full h-full bg-[#0a0a0a] p-1">
                                <FileIcon className="text-[var(--text-secondary)] mb-1" size={20} />
                                <span className="text-[10px] text-[var(--text-secondary)] truncate w-full text-center px-1">{attachment.name}</span>
                            </div>
                        )}

                        <button
                            onClick={() => removeAttachment(attachment.id)}
                            className="absolute top-0 right-0 bg-black text-[var(--text-accent)] border border-[var(--border-color)] px-1 py-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={12} />
                        </button>

                        {attachment.isUploading && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-[10px] text-white gap-1">
                                <div className="w-6 h-6 border-2 border-[var(--text-accent)] border-t-transparent rounded-full animate-spin" />
                                <div className="w-10 h-1 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-[var(--text-accent)] transition-all duration-150" style={{ width: `${attachment.progress}%` }} />
                                </div>
                                <span>{attachment.progress}%</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}
        {hasPendingAttachments && (
            <div className="px-1 text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                Preparing attachments...
            </div>
        )}

                        <div className="flex items-end gap-3">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-10 h-10 border border-[var(--border-color)] bg-[#050505] text-[var(--text-secondary)] hover-glow flex items-center justify-center mb-[2px]"
                            >
                                <Paperclip size={18} strokeWidth={2} />
                            </button>

                            <div className="flex-1">
                                <div className="border border-[var(--border-color)] bg-transparent flex items-end p-2 gap-2 hover-glow transition-all duration-300">
                                    <textarea
                                        ref={textareaRef}
                                        value={input}
                                        onChange={handleInputChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="// Enter command or prompt..."
                                        className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] placeholder:italic pb-1 leading-relaxed resize-none focus:outline-none no-outline max-h-[200px] min-h-[24px] scrollbar-hide"
                                        rows={1}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 h-[40px] mb-[2px]">
                                {/* Reasoning Effort Selector */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsEffortMenuOpen(!isEffortMenuOpen)}
                                        className="w-10 h-10 border border-[var(--border-color)] bg-[#050505] text-[var(--text-secondary)] hover-glow flex items-center justify-center group"
                                        title={`Reasoning Effort: ${reasoningEffort}`}
                                    >
                                        <Sparkles size={18} strokeWidth={2} className="group-hover:rotate-12 transition-transform duration-300" />
                                    </button>

                                    {isEffortMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsEffortMenuOpen(false)}></div>
                                            <div className="absolute bottom-full right-0 mb-2 w-[180px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] overflow-hidden z-20 p-1 animate-in fade-in slide-in-from-bottom-2 duration-100 origin-bottom-right">
                                                <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--text-secondary)]">Reasoning Effort</div>

                                                {(['low', 'medium', 'high'] as const).map((effort) => (
                                                    <button
                                                        key={effort}
                                                        onClick={() => { setReasoningEffort(effort); setIsEffortMenuOpen(false); }}
                                                        className="flex items-center justify-between w-full text-left px-2 py-2 hover:bg-[#0a0a0a] text-sm transition-colors"
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
                                        className="w-10 h-10 border border-[var(--text-accent)] bg-black text-[var(--text-accent)] hover:bg-[var(--text-accent)] hover:text-black transition-all duration-150 flex items-center justify-center"
                                    >
                                        <Square size={14} fill="currentColor" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={(!input.trim() && attachments.length === 0) || hasPendingAttachments}
                                        className={cn(
                                            "w-10 h-10 transition-all duration-150 flex items-center justify-center border",
                                            (input.trim() || attachments.length > 0)
                                                ? "bg-[var(--text-accent)] text-black border-[var(--text-accent)] hover:bg-black hover:text-[var(--text-accent)]"
                                                : "bg-[#1a1a1a] text-[var(--text-secondary)] border-[var(--border-color)] cursor-not-allowed"
                                        )}
                                    >
                                        <ArrowUp size={18} strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="text-left text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                            System ready for next instruction.
                        </div>
                    </div>
                </div>
            </main>
        </div >
    );
}
