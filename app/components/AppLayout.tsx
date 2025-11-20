'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatContext } from './ChatContext';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface Chat {
  id: string;
  title: string | null;
  createdAt: string;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [remountKey, setRemountKey] = useState(0);
  
  const router = useRouter();
  const params = useParams();
  // Safely access id, handling potential array/undefined
  const rawId = params?.id;
  const currentChatId = Array.isArray(rawId) ? rawId[0] : rawId || null;

  const refreshChats = () => {
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
      refreshChats();
  }, []);

  const handleNewChat = () => {
      setIsSidebarOpen(false);
      setRemountKey(prev => prev + 1);
      router.push('/');
  };

  const handleSelectChat = (id: string) => {
      setIsSidebarOpen(false);
      if (id !== currentChatId) router.push(`/chat/${id}`);
  };
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
     <ChatContext.Provider value={{ 
         chats, 
         isLoading, 
         refreshChats, 
         isSidebarOpen, 
         toggleSidebar, 
         closeSidebar 
     }}>
        <div className="flex h-screen w-full bg-[var(--bg-main)] text-[var(--text-primary)] overflow-hidden">
            {/* Sidebar */}
            {/* Desktop: always visible, w-[260px] */}
            {/* Mobile: fixed, z-40, transform based on state */}
            
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 md:hidden fade-in duration-200"
                    onClick={closeSidebar}
                />
            )}

            <div className={cn(
                "fixed inset-y-0 left-0 z-40 w-[240px] transition-transform duration-300 md:relative md:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                 <Sidebar 
                    onNewChat={handleNewChat} 
                    chats={chats} 
                    currentChatId={currentChatId} 
                    onSelectChat={handleSelectChat} 
                    onClose={closeSidebar}
                    isLoading={isLoading}
                    onRefresh={refreshChats}
                    className="w-full" 
                 />
            </div>

            <div className="flex-1 flex flex-col h-full relative min-w-0">
                <div key={remountKey} className="h-full w-full">
                    {children}
                </div>
            </div>
        </div>
     </ChatContext.Provider>
  )
}
