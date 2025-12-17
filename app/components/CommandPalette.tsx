'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    ArrowRight,
    Cpu,
    Sparkles,
    Zap,
    Brain,
    Monitor,
    GraduationCap,
    Microscope,
    Plus,
    Trash2,
    LogOut,
    Check,
    Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatContext } from './ChatContext';
import { usePersistedSetting, useChatMode, useAccentColor } from '@/app/hooks/usePersistedSettings';
import { useAuth } from './AuthContext';

type CommandGroup = 'Actions' | 'Models' | 'Modes' | 'Navigation';

interface CommandItem {
    id: string;
    label: string;
    description?: string;
    icon: React.ElementType;
    group: CommandGroup;
    shortcut?: string;
    action: () => void | Promise<void>;
    keywords?: string[]; // For fuzzy search
}

export function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Context & Settings
    const { refreshChats, toggleSidebar, isSidebarOpen } = useChatContext();
    const { signOut } = useAuth();
    const [currentModelId, setCurrentModelId] = usePersistedSetting('MODEL_ID', "gemini-3-flash-preview");
    const [currentModelName, setCurrentModelName] = usePersistedSetting('MODEL_NAME', "Expert");
    const { chatMode, setChatMode } = useChatMode();
    const { accentColor } = useAccentColor();

    // Toggle logic
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 10);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isOpen]);

    // Define Commands
    const commands: CommandItem[] = useMemo(() => [
        // Actions
        {
            id: 'new-chat',
            label: 'New Chat',
            description: 'Start a fresh conversation',
            icon: Plus,
            group: 'Actions',
            shortcut: '⌘N',
            action: () => {
                router.push('/');
                setIsOpen(false);
            }
        },
        {
            id: 'toggle-sidebar',
            label: isSidebarOpen ? 'Close Sidebar' : 'Open Sidebar',
            icon: ArrowRight,
            group: 'Actions',
            shortcut: '⌘B',
            action: () => {
                toggleSidebar();
                setIsOpen(false);
            }
        },

        // Models
        {
            id: 'model-expert',
            label: 'Switch to Expert',
            description: 'Gemini 3 Pro - Best reasoning',
            icon: Brain,
            group: 'Models',
            action: () => {
                setCurrentModelId('gemini-3-pro-preview');
                setCurrentModelName('Expert');
                setIsOpen(false);
            }
        },
        {
            id: 'model-balanced',
            label: 'Switch to Balanced',
            description: 'Gemini 3 Flash - Fast & smart',
            icon: Sparkles,
            group: 'Models',
            action: () => {
                setCurrentModelId('gemini-3-flash-preview');
                setCurrentModelName('Balanced');
                setIsOpen(false);
            }
        },
        {
            id: 'model-fast',
            label: 'Switch to Ultra Fast',
            description: 'Gemini 2.5 Flash Lite - Speed focused',
            icon: Zap,
            group: 'Models',
            action: () => {
                setCurrentModelId('gemini-2.5-flash-lite');
                setCurrentModelName('Ultra Fast');
                setIsOpen(false);
            }
        },

        // Modes
        {
            id: 'mode-chat',
            label: 'Standard Chat',
            description: 'Default interaction mode',
            icon: MessageSquareIcon,
            group: 'Modes',
            action: () => {
                setChatMode('chat');
                setIsOpen(false);
            }
        },
        {
            id: 'mode-learning',
            label: 'Learning Mode',
            description: 'Optimized for educational content',
            icon: GraduationCap,
            group: 'Modes',
            action: () => {
                setChatMode('learning');
                setIsOpen(false);
            }
        },
        {
            id: 'mode-deep-search',
            label: 'Deep Search',
            description: 'Research with internet access',
            icon: Microscope,
            group: 'Modes',
            action: () => {
                setChatMode('deep-search');
                setIsOpen(false);
            }
        },

        // Navigation / Other
        {
            id: 'logout',
            label: 'Log Out',
            icon: LogOut,
            group: 'Actions',
            action: () => {
                signOut();
                setIsOpen(false);
            }
        }
    ], [isSidebarOpen, router, setCurrentModelId, setCurrentModelName, setChatMode, toggleSidebar, signOut]);

    // Filter Logic
    const filteredCommands = useMemo(() => {
        if (!search) return commands;
        const lowerSearch = search.toLowerCase();
        return commands.filter(cmd =>
            cmd.label.toLowerCase().includes(lowerSearch) ||
            cmd.description?.toLowerCase().includes(lowerSearch) ||
            cmd.group.toLowerCase().includes(lowerSearch)
        );
    }, [search, commands]);

    // Keyboard Navigation in List
    useEffect(() => {
        const handleNavigation = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                filteredCommands[selectedIndex]?.action();
            }
        };

        window.addEventListener('keydown', handleNavigation);
        return () => window.removeEventListener('keydown', handleNavigation);
    }, [isOpen, filteredCommands, selectedIndex]);

    // Ensure selected index is valid when list changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [search]);

    // Scroll into view
    useEffect(() => {
        if (listRef.current) {
            const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setIsOpen(false)}
            />

            {/* Palette Panel */}
            <div className="w-full max-w-[600px] bg-[#141414]/90 backdrop-blur-xl border border-[var(--border-color)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative glass-panel">
                {/* Search Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] bg-white/5">
                    <Search className="w-5 h-5 text-[var(--text-secondary)]" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Type a command or search..."
                        className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-sm font-medium"
                        autoFocus
                    />
                    <div className="flex items-center gap-1">
                        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[var(--border-color)] bg-[#1e1e1e] px-1.5 font-mono text-[10px] font-medium text-[var(--text-secondary)] opacity-100">
                            ESC
                        </kbd>
                    </div>
                </div>

                {/* Command List */}
                <div
                    ref={listRef}
                    className="max-h-[360px] overflow-y-auto p-2 space-y-1 scrollbar-custom"
                >
                    {filteredCommands.length === 0 ? (
                        <div className="py-8 text-center text-[var(--text-secondary)] text-sm">
                            No results found.
                        </div>
                    ) : (
                        filteredCommands.map((cmd, index) => {
                            const isSelected = index === selectedIndex;
                            const Icon = cmd.icon;

                            // Check active state for models/modes
                            let isActive = false;
                            if (cmd.group === 'Models') {
                                if (cmd.id === 'model-expert' && currentModelId === 'gemini-3-pro-preview') isActive = true;
                                if (cmd.id === 'model-balanced' && currentModelId === 'gemini-3-flash-preview') isActive = true;
                                if (cmd.id === 'model-fast' && currentModelId === 'gemini-2.5-flash-lite') isActive = true;
                            }
                            if (cmd.group === 'Modes') {
                                if (cmd.id === 'mode-chat' && chatMode === 'chat') isActive = true;
                                if (cmd.id === 'mode-learning' && chatMode === 'learning') isActive = true;
                                if (cmd.id === 'mode-deep-search' && chatMode === 'deep-search') isActive = true;
                            }

                            return (
                                <button
                                    key={cmd.id}
                                    onClick={() => cmd.action()}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 group relative border-l-2",
                                        isSelected
                                            ? "bg-[var(--text-accent)]/10 border-l-[var(--text-accent)]"
                                            : "hover:bg-[#1e1e1e] border-l-transparent"
                                    )}
                                >
                                    {/* Icon Box */}
                                    <div className={cn(
                                        "w-8 h-8 flex items-center justify-center border transition-all duration-150",
                                        isSelected || isActive
                                            ? "bg-[var(--text-accent)] border-[var(--text-accent)] text-black"
                                            : "bg-[#1a1a1a] border-[var(--border-color)] text-[var(--text-secondary)]"
                                    )}>
                                        <Icon size={16} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-sm font-semibold tracking-wide",
                                                isSelected || isActive ? "text-[var(--text-accent)]" : "text-[var(--text-primary)]"
                                            )}>
                                                {cmd.label}
                                            </span>
                                            {cmd.group && (
                                                <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] opacity-60 ml-auto border border-[var(--border-color)] px-1 rounded-sm">
                                                    {cmd.group}
                                                </span>
                                            )}
                                        </div>
                                        {cmd.description && (
                                            <div className="text-[11px] text-[var(--text-secondary)] truncate">
                                                {cmd.description}
                                            </div>
                                        )}
                                    </div>

                                    {isActive && (
                                        <Check size={14} className="text-[var(--text-accent)] ml-2" />
                                    )}

                                    {cmd.shortcut && (
                                        <div className="text-[10px] text-[var(--text-secondary)] bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-[var(--border-color)] ml-2 font-mono">
                                            {cmd.shortcut}
                                        </div>
                                    )}

                                    {/* Selected Indicator - Intensity Bar */}
                                    {isSelected && (
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-[var(--text-accent)] opacity-20" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[#0f0f0f] flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                            <ArrowRight size={10} /> Select
                        </span>
                        <span className="flex items-center gap-1">
                            <ArrowRight size={10} className="rotate-90" /> Navigate
                        </span>
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-[var(--text-accent)] opacity-50">
                        Command System
                    </div>
                </div>
            </div>
        </div>
    );
}

// Icon helper
function MessageSquareIcon({ size, className }: { size?: number, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    )
}
