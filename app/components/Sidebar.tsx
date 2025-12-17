import { X, Pencil, Trash2, Check, MessageSquare, Clock, Sparkles, AlertTriangle, LogOut, Shield, User, GraduationCap, Microscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useChatContext } from './ChatContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Input,
    FadeWrapper,
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui";

interface Chat {
    id: string;
    title: string | null;
    createdAt: string;
    mode?: 'chat' | 'learning' | 'deep-search';
}

interface SidebarProps {
    onNewChat: () => void;
    chats: Chat[];
    currentChatId: string | null;
    onSelectChat: (id: string) => void;
    onClose?: () => void;
    isLoading?: boolean;
    onRefresh?: () => void;
    fetchError?: { message: string; code?: string } | null;
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



export function Sidebar({ onNewChat, chats, currentChatId, onSelectChat, onClose, isLoading, onRefresh, fetchError, className }: SidebarProps & { className?: string }) {
    const groupedChats = groupChatsByDate(chats);
    const { profile, signOut } = useAuth();
    const router = useRouter();
    const { loadMoreChats, hasMoreChats, isLoadingMore } = useChatContext();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [animatingDeleteId, setAnimatingDeleteId] = useState<string | null>(null);
    const [animatingRenameId, setAnimatingRenameId] = useState<string | null>(null);
    const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Infinite scroll handler
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container || isLoadingMore || !hasMoreChats) return;

        // Load more when within 100px of the bottom
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isNearBottom) {
            loadMoreChats();
        }
    }, [loadMoreChats, isLoadingMore, hasMoreChats]);

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

        try {
            await fetch(`/api/chats/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle })
            });
            setEditingId(null);
            // Trigger rename animation
            setAnimatingRenameId(id);
            setTimeout(() => setAnimatingRenameId(null), 600);
            onRefresh?.();
        } catch (e) {
            console.error("Rename failed", e);
            setEditingId(null);
        }
    };

    const confirmDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const idToDelete = deleteId;
        setDeleteId(null);

        // Trigger delete animation first
        setAnimatingDeleteId(idToDelete);

        // Wait for animation to complete before actually deleting
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            await fetch(`/api/chats/${idToDelete}`, { method: 'DELETE' });
            setAnimatingDeleteId(null);
            onRefresh?.();
            if (currentChatId === idToDelete) {
                onNewChat();
            }
        } catch (e) {
            console.error("Delete failed", e);
            setAnimatingDeleteId(null);
        }
    };

    const handleDeleteAll = async () => {
        if (chats.length === 0) {
            setShowDeleteAllDialog(false);
            return;
        }

        setIsDeletingAll(true);

        try {
            // Delete all chats for the current user via server-side endpoint
            const response = await fetch('/api/chats', { method: 'DELETE' });
            if (!response.ok) {
                throw new Error('Failed to delete chats');
            }
            setShowDeleteAllDialog(false);
            setIsDeletingAll(false);
            onRefresh?.();
            onNewChat();
        } catch (e) {
            console.error("Delete all failed", e);
            setIsDeletingAll(false);
        }
    };

    return (
        <div className={cn("bg-[var(--bg-sidebar)] backdrop-blur-md h-full flex flex-col p-3 border-r border-[var(--border-color)] relative", className)}>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-[var(--bg-sidebar-solid)] border border-[var(--border-color)] text-[var(--text-primary)] p-0 gap-0 max-w-[360px]">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[#0f0f0f]">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 flex items-center justify-center border border-red-400/30 bg-red-400/10">
                                <Trash2 size={14} className="text-red-400" />
                            </div>
                            <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--text-primary)]">Delete Chat</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 py-4">
                        <AlertDialogHeader className="gap-3">
                            <AlertDialogTitle className="text-base font-semibold text-[var(--text-primary)]">Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription className="text-[var(--text-secondary)] text-sm leading-relaxed">
                                This will permanently delete this chat and all its messages. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        {/* Warning Box */}
                        <div className="mt-4 p-3 border border-red-400/20 bg-red-400/5 flex items-start gap-2">
                            <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] text-red-400/80 leading-relaxed">
                                All messages in this conversation will be lost forever.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <AlertDialogFooter className="px-4 py-3 border-t border-[var(--border-color)] bg-[#0f0f0f] flex-row gap-2">
                        <AlertDialogCancel className="flex-1 bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)] uppercase tracking-[0.12em] text-xs font-semibold px-4 py-2.5 transition-all duration-150">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="flex-1 bg-[#1a1a1a] border-red-400/50 text-red-400 hover:bg-red-400 hover:text-black hover:border-red-400 uppercase tracking-[0.12em] text-xs font-semibold px-4 py-2.5 transition-all duration-150">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete All Chats Confirmation Dialog */}
            <AlertDialog open={showDeleteAllDialog} onOpenChange={(open) => !open && !isDeletingAll && setShowDeleteAllDialog(false)}>
                <AlertDialogContent className="bg-[var(--bg-sidebar-solid)] border border-[var(--border-color)] text-[var(--text-primary)] p-0 gap-0 max-w-[360px]">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[#0f0f0f]">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 flex items-center justify-center border border-red-400/30 bg-red-400/10">
                                <Trash2 size={14} className="text-red-400" />
                            </div>
                            <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--text-primary)]">Delete All Chats</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 py-4">
                        <AlertDialogHeader className="gap-3">
                            <AlertDialogTitle className="text-base font-semibold text-[var(--text-primary)]">Delete everything?</AlertDialogTitle>
                            <AlertDialogDescription className="text-[var(--text-secondary)] text-sm leading-relaxed">
                                This will permanently delete all <span className="text-[var(--text-accent)] font-semibold">{chats.length}</span> chat{chats.length !== 1 ? 's' : ''} and their entire history.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        {/* Warning Box */}
                        <div className="mt-4 p-3 border border-red-400/20 bg-red-400/5 flex items-start gap-2">
                            <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] text-red-400/80 leading-relaxed">
                                This action is irreversible. All conversations will be permanently erased.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <AlertDialogFooter className="px-4 py-3 border-t border-[var(--border-color)] bg-[#0f0f0f] flex-row gap-2">
                        <AlertDialogCancel disabled={isDeletingAll} className="flex-1 bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)] uppercase tracking-[0.12em] text-xs font-semibold px-4 py-2.5 transition-all duration-150 disabled:opacity-50">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAll} disabled={isDeletingAll} className="flex-1 bg-[#1a1a1a] border-red-400/50 text-red-400 hover:bg-red-400 hover:text-black hover:border-red-400 uppercase tracking-[0.12em] text-xs font-semibold px-4 py-2.5 transition-all duration-150 disabled:opacity-50">
                            {isDeletingAll ? 'Deleting...' : 'Delete All'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Sticky Header for New Chat */}
            <div className="mb-4 z-10 relative flex items-center gap-2">
                <Link
                    href="/"
                    onClick={onNewChat}
                    onMouseEnter={(e) => {
                        const btn = e.currentTarget;
                        const overlay = btn.querySelector('.cursor-aware-button') as HTMLElement;
                        const rect = btn.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;

                        if (overlay) {
                            overlay.style.transition = 'none';
                            btn.style.setProperty('--x', `${x}px`);
                            btn.style.setProperty('--y', `${y}px`);
                            overlay.style.clipPath = `circle(0% at ${x}px ${y}px)`;
                            void overlay.offsetHeight;
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
                    className="group new-chat-btn relative flex-1 flex items-center gap-3 px-3 py-2.5 border border-[var(--border-color)] bg-[#141414] overflow-hidden transition-all duration-300 text-sm font-semibold text-[var(--text-primary)] uppercase tracking-[0.12em] text-left glitch-hover"
                    data-text="New Chat"
                >
                    {/* Base Layer */}
                    <span className="relative z-10 flex items-center gap-3 text-[var(--text-primary)]">
                        <span className="w-7 h-7 flex items-center justify-center border border-[var(--border-color)] bg-[#1a1a1a] group-[.is-hovered]:bg-black group-[.is-hovered]:border-black transition-colors flex-shrink-0">
                            <Sparkles size={14} className="text-[var(--text-accent)] group-[.is-hovered]:text-[var(--text-accent)]" />
                        </span>
                        <span>New Chat</span>
                    </span>

                    {/* Overlay Layer */}
                    <div className="absolute inset-0 flex items-center gap-3 px-3 py-2.5 bg-[var(--text-accent)] text-[var(--accent-contrast)] z-20 pointer-events-none cursor-aware-button">
                        <span className="w-7 h-7 flex items-center justify-center border border-black/20 bg-black/20 flex-shrink-0">
                            <Sparkles size={14} />
                        </span>
                        <span>New Chat</span>
                    </div>
                </Link>
                {/* Mobile Close Button */}
                <button
                    onClick={onClose}
                    className="md:hidden w-10 h-10 flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-accent)] transition-colors"
                    aria-label="Close sidebar"
                >
                    <X size={18} />
                </button>
            </div>

            {fetchError && (
                <div className="mb-3 border border-amber-400/20 bg-amber-400/5 px-3 py-2">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-amber-300 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-amber-200">
                                {fetchError.code === 'DB_TRANSFER_QUOTA_EXCEEDED' ? 'Database quota exceeded' : 'Couldn’t load chats'}
                            </div>
                            <div className="text-[11px] text-amber-200/80 leading-relaxed break-words">
                                {fetchError.message}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Scrollable Content Area */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto scrollbar-custom relative"
            >
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
                                    <div key={label} className="mb-3">
                                        {/* Group Header */}
                                        <div className="flex items-center gap-2 px-2 py-2">
                                            <Clock size={10} className="text-[var(--text-accent)]" />
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)]">{label}</span>
                                            <span className="text-[9px] text-[var(--text-accent)] opacity-70">({chats.length})</span>
                                        </div>

                                        {/* Chat Items */}
                                        <div className="space-y-0.5">
                                            {chats.map((chat) => {
                                                const isSelected = currentChatId === chat.id;
                                                return (
                                                    <div
                                                        key={chat.id}
                                                        onClick={() => {
                                                            if (animatingDeleteId) return;
                                                            // INSTANT NAVIGATION: No Next.js, pure client-side
                                                            window.history.pushState({}, '', `/chat/${chat.id}`);
                                                            // Manually dispatch popstate to notify ChatInterface
                                                            window.dispatchEvent(new PopStateEvent('popstate'));
                                                        }}
                                                        className={cn(
                                                            "group relative px-2 py-2 text-sm cursor-pointer transition-all duration-150 flex items-center gap-2.5 border-l-2",
                                                            isSelected
                                                                ? "border-l-[var(--text-accent)] bg-[var(--text-accent)]/10 text-[var(--text-primary)]"
                                                                : "border-l-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#1e1e1e]",
                                                            animatingDeleteId === chat.id && "chat-item-deleting",
                                                            animatingRenameId === chat.id && "chat-item-renamed"
                                                        )}
                                                    >
                                                        {/* Chat Icon - different based on mode */}
                                                        <div className={cn(
                                                            "w-6 h-6 flex items-center justify-center border flex-shrink-0 transition-all duration-150 relative",
                                                            isSelected
                                                                ? "bg-[var(--text-accent)] border-[var(--text-accent)] text-black"
                                                                : chat.mode === 'deep-search' || chat.mode === 'learning'
                                                                    ? "bg-[#1a1a1a] border-[var(--text-accent)]/50 text-[var(--text-accent)]"
                                                                    : "bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-secondary)] group-hover:border-[var(--text-accent)]/50 group-hover:text-[var(--text-accent)]"
                                                        )}>
                                                            {chat.mode === 'deep-search' ? (
                                                                <Microscope size={12} />
                                                            ) : chat.mode === 'learning' ? (
                                                                <GraduationCap size={12} />
                                                            ) : (
                                                                <MessageSquare size={12} />
                                                            )}
                                                        </div>

                                                        {/* Render Title or Input */}
                                                        {editingId === chat.id ? (
                                                            <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                                <Input
                                                                    ref={inputRef}
                                                                    value={renameValue}
                                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleRename();
                                                                        if (e.key === 'Escape') setEditingId(null);
                                                                    }}
                                                                    onBlur={handleRename}
                                                                    className="h-7 text-xs px-2 py-0 bg-[#141414] border border-[var(--border-active)] text-[var(--text-primary)] focus-visible:ring-0"
                                                                />
                                                                <button onClick={handleRename} className="p-1 hover:text-[var(--text-accent)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                                                                    <Check size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className={cn(
                                                                    "truncate flex-1 text-xs",
                                                                    isSelected && "font-medium text-[var(--text-accent)]"
                                                                )}>
                                                                    {chat.title || 'New Chat'}
                                                                </span>

                                                                {/* Hover Actions */}
                                                                {!editingId && (
                                                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={(e) => startRenaming(chat, e)}
                                                                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-accent)] bg-[var(--bg-sidebar)] border border-[var(--border-color)] transition-colors"
                                                                            title="Rename"
                                                                        >
                                                                            <Pencil size={10} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => confirmDelete(chat.id, e)}
                                                                            className="p-1.5 text-[var(--text-secondary)] hover:text-red-400 bg-[var(--bg-sidebar)] border border-[var(--border-color)] transition-colors"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 size={10} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>

                        {/* Load More Indicator */}
                        {hasMoreChats && (
                            <div className="py-4 flex justify-center">
                                {isLoadingMore ? (
                                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs">
                                        <div className="w-4 h-4 border-2 border-[var(--text-accent)] border-t-transparent rounded-full animate-spin" />
                                        <span>Loading more...</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={loadMoreChats}
                                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors"
                                    >
                                        Load more chats
                                    </button>
                                )}
                            </div>
                        )}
                    </FadeWrapper>
                </div>
            </div>

            {/* Footer - User Info */}
            <div className="mt-auto pt-3 border-t border-[var(--border-color)] z-10 relative bg-[var(--bg-sidebar)]">
                {/* User Profile Section */}
                {profile && (
                    <div className="px-2 py-2 space-y-2">
                        {/* User Info */}
                        <div className="flex items-center gap-2">
                            {/* Avatar with initials - subtle dark design */}
                            <div className="w-8 h-8 flex items-center justify-center bg-[#1a1a1a] border border-[var(--border-color)] flex-shrink-0 relative">
                                {profile.name ? (
                                    <span className="text-[11px] font-semibold text-[var(--text-accent)] uppercase tracking-wide">
                                        {profile.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                    </span>
                                ) : (
                                    <User size={14} className="text-[var(--text-secondary)]" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-semibold text-[var(--text-primary)] truncate flex items-center gap-1.5">
                                    {profile.name || 'User'}
                                    {profile.isAdmin && (
                                        <span className="text-[8px] px-1 py-0.5 bg-[var(--text-accent)]/15 border border-[var(--text-accent)]/30 text-[var(--text-accent)] uppercase tracking-wider font-bold">
                                            Admin
                                        </span>
                                    )}
                                </div>
                                <div className="text-[9px] text-[var(--text-secondary)] truncate">
                                    {profile.email}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1">
                            {profile.isAdmin && (
                                <button
                                    onClick={() => router.push('/admin')}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] uppercase tracking-wider font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)] transition-all"
                                    title="Dashboard"
                                >
                                    Dashboard
                                </button>
                            )}
                            <button
                                onClick={signOut}
                                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] uppercase tracking-wider font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-red-400/50 hover:text-red-400 transition-all"
                                title="Logout"
                            >
                                <LogOut size={10} />
                                Logout
                            </button>
                        </div>
                    </div>
                )}

                {/* Brand Footer */}
                <div className="flex items-center justify-between px-2 py-2 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 flex items-center justify-center border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/10 flex-shrink-0">
                            <Sparkles size={10} className="text-[var(--text-accent)]" />
                        </div>
                        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                            Cracker
                        </span>
                    </div>

                    <button
                        onClick={() => setShowDeleteAllDialog(true)}
                        className="px-1.5 py-0.5 text-[8px] uppercase tracking-wider border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-red-400/50 hover:text-red-400 transition-all duration-150 cursor-pointer truncated max-w-[60px]"
                        title="Delete all chats"
                    >
                        {process.env.NODE_ENV === 'development' ? 'DEV' : 'v1.0'}
                    </button>
                </div>
            </div>
        </div>
    );
}
