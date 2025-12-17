'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatContext } from './ChatContext';
import { Sidebar } from './Sidebar';
import { VisualEffects } from './VisualEffects';
import { CommandPalette } from './CommandPalette';
import { PerformanceMonitor, trackCacheHit, trackCacheMiss, trackLoadTime } from './PerformanceMonitor';
import { useAuth } from './AuthContext';
import { cn } from '@/lib/utils';

interface Chat {
    id: string;
    title: string | null;
    mode?: 'chat' | 'learning' | 'deep-search';
    createdAt: string;
    messages?: any[]; // Add messages to the chat interface for preloading
}

import Cookies from 'js-cookie';
import { cacheChats, getCachedChats } from '@/lib/cache';

export default function AppLayout({ children, initialSidebarOpen = true }: { children: React.ReactNode; initialSidebarOpen?: boolean }) {
    const { user, isLoading: authLoading } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [chatsFetchError, setChatsFetchError] = useState<{ message: string; code?: string } | null>(null);
    const [hasMoreChats, setHasMoreChats] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Initialize sidebar state from server cookie (passed as prop)
    const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);

    const [remountKey, setRemountKey] = useState(0);

    const router = useRouter();
    const { id: chatId } = useParams(); // Destructure id as chatId

    // Resizable Sidebar State - keep using localStorage for width as it's less critical for layout shift
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebarWidth');
            return saved ? parseInt(saved) : 260;
        }
        return 260;
    });
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Track current chat ID from URL (supports pushState navigation)
    const getUrlChatId = () => {
        if (typeof window === 'undefined') return null;
        const match = window.location.pathname.match(/\/chat\/([^/]+)/);
        return match ? match[1] : null;
    };

    const [currentChatId, setCurrentChatId] = useState<string | null>(() => {
        // Initial value from params or URL
        const paramId = Array.isArray(chatId) ? chatId[0] : chatId || null;
        return paramId || getUrlChatId();
    });

    // Sync currentChatId with URL changes (popstate from sidebar navigation)
    useEffect(() => {
        const handleUrlChange = () => {
            const urlChatId = getUrlChatId();
            setCurrentChatId(urlChatId);
        };
        window.addEventListener('popstate', handleUrlChange);
        return () => window.removeEventListener('popstate', handleUrlChange);
    }, []);

    const fetchChats = async () => {
        const startTime = performance.now();
        setChatsFetchError(null);

        try {
            // Try to get cached chats first for instant loading
            const cachedChats = await getCachedChats();

            if (cachedChats && cachedChats.length > 0) {
                console.log('Using cached chats for instant loading');
                trackCacheHit();
                trackLoadTime(startTime, 'cache');
                setChats(cachedChats);
                setIsLoading(false);

                // Fetch fresh data in background and update cache
                fetch('/api/chats-with-messages?limit=15&includeMessages=0')
                    .then(async (res) => ({ ok: res.ok, body: await res.json().catch(() => null) }))
                    .then(({ ok, body }) => {
                        // Handle new paginated response format
                        if (!ok) {
                            setChatsFetchError({
                                message: body?.error || 'Failed to fetch chats.',
                                code: body?.code,
                            });
                            return;
                        }

                        const data = body?.chats || body;
                        if (Array.isArray(data)) {
                            setHasMoreChats(body?.hasMore ?? true);
                            // Update cache with fresh data
                            cacheChats(data).catch(err =>
                                console.error("Failed to update cache:", err)
                            );
                            // Only update state if data is significantly different (new chats or TITLE changes)
                            const hasNewChats = data.length !== cachedChats.length ||
                                data.some(newChat => {
                                    const cached = cachedChats.find(c => c.id === newChat.id);
                                    return !cached || cached.title !== newChat.title;
                                });
                            if (hasNewChats) {
                                setChats(data);
                            }
                        }
                    })
                    .catch(err => console.error("Failed to fetch fresh chats:", err));
            } else {
                // No cache available, fetch from server
                console.log('No cache available, fetching from server');
                trackCacheMiss();
                const networkStartTime = performance.now();

                fetch('/api/chats-with-messages?limit=15&includeMessages=0')
                    .then(async (res) => ({ ok: res.ok, body: await res.json().catch(() => null) }))
                    .then(({ ok, body }) => {
                        trackLoadTime(networkStartTime, 'network');
                        if (!ok) {
                            setChatsFetchError({
                                message: body?.error || 'Failed to fetch chats.',
                                code: body?.code,
                            });
                            return;
                        }

                        const data = body?.chats || body;
                        if (Array.isArray(data)) {
                            setHasMoreChats(body?.hasMore ?? true);
                            // Cache the data for future use
                            cacheChats(data).catch(err =>
                                console.error("Failed to cache chats:", err)
                            );
                            setChats(data);
                        }
                    })
                    .catch(err => console.error("Failed to fetch chats:", err))
                    .finally(() => setIsLoading(false));
            }
        } catch (error) {
            console.error("Cache operation failed, falling back to network:", error);
            trackCacheMiss();
            const networkStartTime = performance.now();

            // Fallback to network if cache fails
            fetch('/api/chats?limit=15')
                .then(async (res) => ({ ok: res.ok, body: await res.json().catch(() => null) }))
                .then(({ ok, body }) => {
                    trackLoadTime(networkStartTime, 'network');
                    if (!ok) {
                        setChatsFetchError({
                            message: body?.error || 'Failed to fetch chats.',
                            code: body?.code,
                        });
                        return;
                    }

                    const data = body?.chats || body;
                    if (Array.isArray(data)) setChats(data);
                })
                .catch(err => console.error("Failed to fetch chats:", err))
                .finally(() => setIsLoading(false));
        }
    };

    // Load more chats for infinite scroll
    const loadMoreChats = useCallback(async () => {
        if (isLoadingMore || !hasMoreChats) return;

        setIsLoadingMore(true);
        try {
            const response = await fetch(`/api/chats-with-messages?limit=15&offset=${chats.length}&includeMessages=0`);
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                setChatsFetchError({
                    message: data?.error || 'Failed to load more chats.',
                    code: data?.code,
                });
                return;
            }

            if (data.chats && Array.isArray(data.chats)) {
                setChats(prev => [...prev, ...data.chats]);
                setHasMoreChats(data.hasMore ?? false);

                // Update cache with all chats
                cacheChats([...chats, ...data.chats]).catch(err =>
                    console.error("Failed to update cache:", err)
                );
            }
        } catch (err) {
            console.error("Failed to load more chats:", err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [chats, isLoadingMore, hasMoreChats]);

    useEffect(() => {
        // Don't fetch while auth is still loading
        if (authLoading) return;

        setIsLoading(true);
        fetchChats();
    }, [user, authLoading]);

    const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
        setIsResizing(true);
        mouseDownEvent.preventDefault();
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
        localStorage.setItem('sidebarWidth', sidebarWidth.toString());
    }, [sidebarWidth]);

    const resize = useCallback((mouseMoveEvent: MouseEvent) => {
        if (isResizing) {
            const newWidth = mouseMoveEvent.clientX;
            if (newWidth >= 200 && newWidth <= 480) {
                setSidebarWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    const handleNewChat = () => {
        // Update URL to homepage and notify listeners
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
        setCurrentChatId(null); // Clear active indicator immediately

        // Only close sidebar on mobile
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
            Cookies.set('sidebarOpen', 'false', { expires: 365 });
        }
        setRemountKey(prev => prev + 1);
    };

    const handleSelectChat = (id: string) => {
        // URL is already updated by Sidebar via history.pushState
        // No need to trigger Next.js navigation
    };

    const toggleSidebar = () => {
        const newState = !sidebarOpen;
        setSidebarOpen(newState);
        Cookies.set('sidebarOpen', String(newState), { expires: 365 });
    };
    const closeSidebar = () => {
        setSidebarOpen(false);
        Cookies.set('sidebarOpen', 'false', { expires: 365 });
    };

    return (
        <ChatContext.Provider value={{
            chats,
            isLoading,
            refreshChats: fetchChats,
            loadMoreChats,
            hasMoreChats,
            isLoadingMore,
            isSidebarOpen: sidebarOpen,
            toggleSidebar,
            closeSidebar
        }}>
            <div className="flex h-[100dvh] w-full bg-[var(--bg-main)] text-[var(--text-primary)] relative">
                {/* Visual Effects Overlay */}
                <VisualEffects />

                {/* Command Palette */}
                <CommandPalette />

                {/* Sidebar */}
                {/* Desktop: always visible, w-[260px] */}
                {/* Mobile: fixed, z-40, transform based on state */}

                {/* Mobile Overlay - must be BELOW sidebar (z-40) so clicks on sidebar work */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={closeSidebar}
                    />
                )}

                {/* Desktop Sidebar (Fixed Toggle) */}
                <div
                    className={cn(
                        "hidden md:flex flex-col h-full z-30 relative flex-shrink-0 border-r border-[var(--border-color)] transition-all duration-300 ease-in-out",
                        sidebarOpen ? "w-[260px] translate-x-0" : "w-0 -translate-x-full opacity-0 overflow-hidden"
                    )}
                >
                    <Sidebar
                        onNewChat={handleNewChat}
                        chats={chats}
                        currentChatId={currentChatId}
                        onSelectChat={handleSelectChat}
                        onClose={closeSidebar}
                        isLoading={isLoading}
                        onRefresh={fetchChats}
                        fetchError={chatsFetchError}
                        className="w-full h-full"
                    />
                </div>

                {/* Mobile Sidebar (Fixed) */}
                <div
                    className={cn(
                        "fixed inset-y-0 left-0 w-[280px] z-50 transform md:hidden transition-transform duration-300 ease-in-out",
                        sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    <Sidebar
                        onNewChat={handleNewChat}
                        chats={chats}
                        currentChatId={currentChatId}
                        onSelectChat={(id) => {
                            router.push(`/chat/${id}`);
                            setSidebarOpen(false);
                        }}
                        onClose={() => setSidebarOpen(false)}
                        isLoading={isLoading}
                        onRefresh={fetchChats}
                        fetchError={chatsFetchError}
                    />
                </div>

                <div className="flex-1 flex flex-col h-full relative min-w-0 z-10">
                    <div key={remountKey} className="h-full w-full">
                        {children}
                    </div>
                </div>

                {/* Performance Monitor - only in development */}
                {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
            </div>
        </ChatContext.Provider>
    )
}
