'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatContext } from './ChatContext';
import { Sidebar } from './Sidebar';
import { VisualEffects } from './VisualEffects';
import { CommandPalette } from './CommandPalette';
import { cn } from '@/lib/utils';

interface Chat {
    id: string;
    title: string | null;
    mode?: 'chat' | 'learning' | 'deep-search';
    createdAt: string;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true); // Changed from isSidebarOpen, initial true
    const [remountKey, setRemountKey] = useState(0);

    const router = useRouter();
    const { id: chatId } = useParams(); // Destructure id as chatId

    // Resizable Sidebar State
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Safely access id, handling potential array/undefined
    const currentChatId = Array.isArray(chatId) ? chatId[0] : chatId || null;

    const fetchChats = () => { // Renamed from refreshChats
        // Don't set loading to true on refresh to avoid flickering skeleton on every new chat
        fetch('/api/chats')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setChats(data);
            })
            .catch(err => console.error("Failed to fetch chats:", err))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        fetchChats(); // Call fetchChats
    }, []);

    // Load saved width
    useEffect(() => {
        const savedWidth = localStorage.getItem('sidebarWidth');
        if (savedWidth) setSidebarWidth(parseInt(savedWidth));
    }, []);

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
        // Only close sidebar on mobile
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
        setRemountKey(prev => prev + 1);
    };

    const handleSelectChat = (id: string) => {
        // Don't close sidebar - user can use toggle button
        if (id !== currentChatId) router.push(`/chat/${id}`);
    };

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen); // Updated to use sidebarOpen
    const closeSidebar = () => setSidebarOpen(false); // Updated to use setSidebarOpen

    return (
        <ChatContext.Provider value={{
            chats,
            isLoading,
            refreshChats: fetchChats, // Provide fetchChats as refreshChats
            isSidebarOpen: sidebarOpen, // Provide sidebarOpen as isSidebarOpen
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
                        "hidden md:flex flex-col h-full z-30 transition-all duration-300 ease-in-out relative flex-shrink-0 border-r border-[var(--border-color)]",
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
                        className="w-full h-full"
                    />
                </div>

                {/* Mobile Sidebar (Fixed) */}
                <div className={cn(
                    "fixed inset-y-0 left-0 w-[280px] z-50 transform transition-transform duration-300 ease-in-out md:hidden",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
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
                    />
                </div>

                <div className="flex-1 flex flex-col h-full relative min-w-0 z-10">
                    <div key={remountKey} className="h-full w-full">
                        {children}
                    </div>
                </div>
            </div>
        </ChatContext.Provider>
    )
}
