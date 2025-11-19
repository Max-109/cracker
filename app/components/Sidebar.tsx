import { SquarePen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';
import { useState, useEffect } from 'react';

interface Chat {
  id: string;
  title: string | null;
  createdAt: string;
}

interface SidebarProps {
  onNewChat: () => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onClose?: () => void;
  isLoading?: boolean;
}

function groupChatsByDate(chats: Chat[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const groups: Record<string, Chat[]> = {
        'Today': [],
        'Yesterday': [],
        'Previous 7 Days': [],
        'Older': []
    };

    chats.forEach(chat => {
        const chatDate = new Date(chat.createdAt);
        if (chatDate >= today) {
            groups['Today'].push(chat);
        } else if (chatDate >= yesterday) {
            groups['Yesterday'].push(chat);
        } else if (chatDate >= sevenDaysAgo) {
            groups['Previous 7 Days'].push(chat);
        } else {
            groups['Older'].push(chat);
        }
    });

    return groups;
}

// Smooth Fade Wrapper for Skeletons/Content
function FadeWrapper({ show, children, className, isAbsolute = false }: { show: boolean; children: React.ReactNode; className?: string; isAbsolute?: boolean }) {
    const [shouldRender, setShouldRender] = useState(show);
    const [isFadingIn, setIsFadingIn] = useState(false);

    useEffect(() => {
        if (show) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShouldRender(true);
            requestAnimationFrame(() => setIsFadingIn(true));
        } else {
            setIsFadingIn(false);
            const timer = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [show]);

    if (!shouldRender) return null;

    return (
        <div 
            className={cn(
                "transition-opacity duration-300",
                isAbsolute ? "absolute inset-0 w-full h-full" : "relative",
                isFadingIn ? "opacity-100" : "opacity-0", 
                className
            )}
        >
            {children}
        </div>
    );
}

export function Sidebar({ onNewChat, chats, currentChatId, onSelectChat, onClose, isLoading, className }: SidebarProps & { className?: string }) {
  const groupedChats = groupChatsByDate(chats);

  return (
    <div className={cn("bg-[var(--bg-sidebar)] h-full flex flex-col p-3 border-r border-transparent relative", className)}>
      {/* Sticky Header for New Chat */}
      <div className="mb-4 z-10 relative flex items-center gap-2">
         <button 
            onClick={onNewChat}
            className="flex-1 flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-sm font-medium text-[var(--text-primary)] text-left"
          >
            <SquarePen size={18} strokeWidth={2} />
            <span>New Chat</span>
        </button>
        {/* Mobile Close Button */}
        <button 
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
            aria-label="Close sidebar"
        >
            <X size={20} />
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-custom relative">
        <div className="relative min-h-full">
            {/* Loading State - Absolute Overlay */}
            <FadeWrapper show={!!isLoading} isAbsolute={true} className="z-10 bg-[var(--bg-sidebar)]">
                <div className="space-y-4 px-2">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-12 bg-[var(--border-color)]" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-3/4" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-16 bg-[var(--border-color)]" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-5/6" />
                    </div>
                </div>
            </FadeWrapper>

            {/* Content State - Relative Flow */}
            <FadeWrapper show={!isLoading} isAbsolute={false}>
                <div className="pb-4">
                    {Object.entries(groupedChats).map(([label, group]) => (
                        group.length > 0 && (
                            <div key={label} className="mb-4">
                                <div className="text-xs font-medium text-[var(--text-secondary)] px-2 py-2">{label}</div>
                                {group.map((chat) => (
                                    <div
                                        key={chat.id}
                                        onClick={() => onSelectChat(chat.id)}
                                        className={cn(
                                            "px-2 py-2 text-sm text-[var(--text-primary)] rounded-lg cursor-pointer truncate transition-colors mb-1",
                                            currentChatId === chat.id ? "bg-[var(--bg-hover)]" : "hover:bg-[var(--bg-hover)]"
                                        )}
                                    >
                                        {chat.title || 'New Chat'}
                                    </div>
                                ))}
                            </div>
                        )
                    ))}
                </div>
            </FadeWrapper>
        </div>
      </div>
      
      {/* User Profile Section */}
      <div className="mt-auto pt-2 border-t border-[#2F2F2F] z-10 relative bg-[var(--bg-sidebar)]">
        <button className="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-[var(--bg-hover)] w-full text-left transition-colors group">
          <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-semibold text-xs">
            JD
          </div>
          <div className="flex flex-col text-sm">
            <span className="text-[var(--text-primary)] font-medium">John Doe</span>
            <span className="text-[var(--text-secondary)] text-xs">Free Plan</span>
          </div>
        </button>
      </div>
    </div>
  );
}
