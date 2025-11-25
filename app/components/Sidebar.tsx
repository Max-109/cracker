import { SquarePen, X, Pencil, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    onRefresh?: () => void;
}

function groupChatsByDate(chats: Chat[]) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const sorted = [...chats].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const groups: { label: string; chats: Chat[], order: number }[] = [];
    const groupMap = new Map<string, { label: string; chats: Chat[], order: number }>();

    sorted.forEach(chat => {
        const chatDate = new Date(chat.createdAt);
        let label = '';
        let order = 0; // Higher order = appears first (since we sort groups later if needed, or rely on insertion order)

        if (chatDate >= todayStart) {
            const diffMs = now.getTime() - chatDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins === 0) {
                label = 'Just now';
                order = 100;
            } else if (diffMins < 60) {
                label = `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
                order = 90 - diffMins;
            } else {
                const diffHours = Math.floor(diffMins / 60);
                if (diffHours === 1) label = '1 hour ago';
                else label = `${diffHours} hours ago`;
                order = 50 - diffHours;
            }
        } else if (chatDate >= yesterdayStart) {
            // "11:00 AM", "3 PM"
            // If minutes is 00, show "3 PM", else "3:30 PM" to be cleaner? 
            // User asked for "11:00 AM" and "3PM".
            // Let's standardise on h:mm A for consistency.
            label = chatDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            order = 10; // Yesterday comes after Today
        } else {
            label = chatDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            order = 0; // Older
        }

        if (!groupMap.has(label)) {
            const group = { label, chats: [] as Chat[], order };
            groupMap.set(label, group);
            groups.push(group);
        }
        groupMap.get(label)!.chats.push(chat);
    });

    // Since 'groups' preserves insertion order and 'sorted' is time-descending, 
    // the groups should naturally be in correct time order (Newest buckets first).
    // "Just now" (first chats) -> "10 mins ago" (later chats) -> ...
    // So explicit sorting of groups might not be strictly needed if insertion order is respected,
    // but let's just return 'groups' as is because 'sorted' loop drives creation order.

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

export function Sidebar({ onNewChat, chats, currentChatId, onSelectChat, onClose, isLoading, onRefresh, className }: SidebarProps & { className?: string }) {
    const groupedChats = groupChatsByDate(chats);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingId]);

    const startRenaming = (chat: Chat, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(chat.id);
        setRenameValue(chat.title || 'New Chat');
    };

    const handleRename = async () => {
        if (!editingId) return;
        const id = editingId;
        const newTitle = renameValue.trim() || "New Chat";

        // Optimistic Update (optional, but let's wait for server)
        try {
            await fetch(`/api/chats/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle })
            });
            onRefresh?.();
        } catch (e) {
            console.error("Rename failed", e);
        }
        setEditingId(null);
    };

    const confirmDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await fetch(`/api/chats/${deleteId}`, { method: 'DELETE' });
            onRefresh?.();
            if (currentChatId === deleteId) {
                onNewChat();
            }
        } catch (e) {
            console.error("Delete failed", e);
        }
        setDeleteId(null);
    };

    return (
        <div className={cn("bg-[var(--bg-sidebar)] h-full flex flex-col p-3 border-r border-[var(--border-color)] relative", className)}>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-primary)]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete chat?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[var(--text-secondary)]">
                            This will permanently delete your chat history. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700 border-none">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Sticky Header for New Chat */}
            <div className="mb-4 z-10 relative flex items-center gap-2">
                <button
                    onClick={onNewChat}
                    onMouseEnter={(e) => {
                        const btn = e.currentTarget;
                        const overlay = btn.querySelector('.cursor-aware-button') as HTMLElement;
                        const rect = btn.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        
                        // Disable transition, reset to new position, then animate
                        if (overlay) {
                            overlay.style.transition = 'none';
                            btn.style.setProperty('--x', `${x}px`);
                            btn.style.setProperty('--y', `${y}px`);
                            overlay.style.clipPath = `circle(0% at ${x}px ${y}px)`;
                            
                            // Force reflow
                            void overlay.offsetHeight;
                            
                            // Re-enable transition and expand
                            overlay.style.transition = '';
                            overlay.style.clipPath = '';
                            btn.classList.add('is-hovered');
                        }
                    }}
                    onMouseLeave={(e) => {
                        const btn = e.currentTarget;
                        const rect = btn.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        btn.style.setProperty('--x', `${x}px`);
                        btn.style.setProperty('--y', `${y}px`);
                        btn.classList.remove('is-hovered');
                    }}
                    style={{ '--x': '50%', '--y': '50%' } as React.CSSProperties}
                    className="group new-chat-btn relative flex-1 flex items-center gap-2 px-3 py-2 border border-[var(--border-color)] bg-[#141414] overflow-hidden transition-all duration-300 text-sm font-semibold text-[var(--text-primary)] uppercase tracking-[0.12em] text-left"
                >
                    {/* Base Layer (White Text, Dark BG) */}
                    <span className="relative z-10 flex items-center gap-2 text-[var(--text-primary)]">
                        <SquarePen size={18} strokeWidth={2} />
                        <span>New Chat</span>
                    </span>

                    {/* Overlay Layer (Black Text, Orange BG) - Revealed by Clip Path */}
                    <div
                        className="absolute inset-0 flex items-center gap-2 px-3 py-2 bg-[var(--text-accent)] text-black z-20 pointer-events-none cursor-aware-button"
                    >
                        <SquarePen size={18} strokeWidth={2} />
                        <span>New Chat</span>
                    </div>
                </button>
                {/* Mobile Close Button */}
                <button
                    onClick={onClose}
                    className="md:hidden px-2 py-1 border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-active)] transition-colors"
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
                            {groupedChats.map(({ label, chats }) => (
                                chats.length > 0 && (
                                    <div key={label} className="mb-4">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-accent)] px-2 py-2">{label}</div>
                                        {chats.map((chat) => (
                                            <div
                                                key={chat.id}
                                                onClick={() => onSelectChat(chat.id)}
                                                className={cn(
                                                    "group relative px-3 py-2 text-sm cursor-pointer transition-colors mb-1 flex items-center justify-between border-l-2",
                                                    currentChatId === chat.id
                                                        ? "border-l-[var(--text-accent)] bg-gradient-to-r from-[var(--text-accent)]/10 to-transparent text-[var(--text-primary)]"
                                                        : "border-l-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                                )}
                                            >
                                                {/* Render Title or Input */}
                                                {editingId === chat.id ? (
                                                    <div className="flex-1 flex items-center gap-1 mr-1" onClick={(e) => e.stopPropagation()}>
                                                        <Input
                                                            ref={inputRef}
                                                            value={renameValue}
                                                            onChange={(e) => setRenameValue(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleRename();
                                                                if (e.key === 'Escape') setEditingId(null);
                                                            }}
                                                            onBlur={handleRename}
                                                            className="h-8 text-sm px-2 py-0 bg-[#141414] border border-[var(--border-active)] text-[var(--text-primary)] focus-visible:ring-0"
                                                        />
                                                        <button onClick={handleRename} className="p-1 hover:text-[var(--text-accent)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                                                            <Check size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="truncate flex-1 pr-2">{chat.title || 'New Chat'}</span>

                                                        {/* Hover Actions (Pencil, Trash) */}
                                                        {/* Only show if not editing */}
                                                        {!editingId && (
                                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={(e) => startRenaming(chat, e)}
                                                                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-accent)] bg-[var(--bg-sidebar)] border border-[var(--border-color)]"
                                                                    title="Rename"
                                                                >
                                                                    <Pencil size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => confirmDelete(chat.id, e)}
                                                                    className="p-1.5 text-[var(--text-secondary)] hover:text-red-400 bg-[var(--bg-sidebar)] border border-[var(--border-color)]"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
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
            <div className="mt-auto pt-3 border-t border-[var(--border-color)] z-10 relative bg-[var(--bg-sidebar)]">
                <div className="flex items-center justify-between px-2 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                    <span>Cracker</span>
                    <span className="text-[var(--text-accent)]">{process.env.NODE_ENV === 'development' ? 'DEV' : 'PRODUCTION'}</span>
                </div>
            </div>
        </div>
    );
}
