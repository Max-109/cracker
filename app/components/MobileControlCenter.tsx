'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Settings2, ChevronUp, History, Sparkles, Brain, Zap, MessageSquare, GraduationCap, Microscope, X } from 'lucide-react';
import { useChatContext } from './ChatContext';
import { usePersistedSetting, useChatMode, useAccentColor } from '@/app/hooks/usePersistedSettings';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function MobileControlCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'models' | 'modes' | 'settings'>('models');

    // Settings logic (reused from CommandPalette/ModelSelector)
    const [currentModelId, setCurrentModelId] = usePersistedSetting('MODEL_ID', "gemini-3-flash-preview");
    const { chatMode, setChatMode } = useChatMode();
    const router = useRouter();

    const toggleOpen = () => setIsOpen(!isOpen);

    // Close on route change
    useEffect(() => {
        setIsOpen(false);
    }, [router]);

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] pointer-events-none">
            {/* Trigger Button (Floating Pill) */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto"
                    >
                        <button
                            onClick={() => setIsOpen(true)}
                            className="bg-[#141414]/90 backdrop-blur-md border border-[var(--border-color)] text-[var(--text-primary)] px-5 py-2.5 rounded-full shadow-xl flex items-center gap-3 active:scale-95 transition-transform"
                        >
                            <Settings2 size={16} className="text-[var(--text-accent)]" />
                            <span className="text-xs font-semibold tracking-wide uppercase">Control Center</span>
                            <ChevronUp size={14} className="opacity-50" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto"
                    />
                )}
            </AnimatePresence>

            {/* Bottom Sheet */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute bottom-0 left-0 right-0 bg-[#141414] border-t border-[var(--border-color)] rounded-t-[20px] shadow-2xl pointer-events-auto overflow-hidden max-h-[80vh] flex flex-col"
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.05}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100 || info.velocity.y > 500) {
                                setIsOpen(false);
                            }
                        }}
                    >
                        {/* Drag Handle */}
                        <div className="w-full flex justify-center pt-3 pb-2 touch-none">
                            <div className="w-12 h-1 bg-[#333] rounded-full" />
                        </div>

                        {/* Valid Header Content */}
                        <div className="px-6 pb-4 flex items-center justify-between border-b border-[var(--border-color)]">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">Control Center</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 -mr-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-[#0f0f0f] border-b border-[var(--border-color)]">
                            <TabBtn active={activeTab === 'models'} onClick={() => setActiveTab('models')} icon={Brain}>Models</TabBtn>
                            <TabBtn active={activeTab === 'modes'} onClick={() => setActiveTab('modes')} icon={Sparkles}>Modes</TabBtn>
                        </div>

                        {/* Content Area */}
                        <div className="p-4 overflow-y-auto min-h-[300px] pb-10">

                            {/* MODELS TAB */}
                            {activeTab === 'models' && (
                                <div className="space-y-3">
                                    <ModelOption
                                        id="gemini-3-pro-preview"
                                        name="Gemini 3 Pro"
                                        desc="Expert reasoning & coding"
                                        currentId={currentModelId}
                                        onSelect={setCurrentModelId}
                                        icon={Brain}
                                    />
                                    <ModelOption
                                        id="gemini-3-flash-preview"
                                        name="Gemini 3 Flash"
                                        desc="Balanced speed & intelligence"
                                        currentId={currentModelId}
                                        onSelect={setCurrentModelId}
                                        icon={Sparkles}
                                    />
                                    <ModelOption
                                        id="gemini-2.5-flash-lite"
                                        name="Gemini 2.5 Flash Lite"
                                        desc="Ultra fast responses"
                                        currentId={currentModelId}
                                        onSelect={setCurrentModelId}
                                        icon={Zap}
                                    />
                                </div>
                            )}

                            {/* MODES TAB */}
                            {activeTab === 'modes' && (
                                <div className="space-y-3">
                                    <ModeOption
                                        mode="chat"
                                        name="Standard Chat"
                                        desc="Default conversation mode"
                                        currentMode={chatMode}
                                        onSelect={setChatMode}
                                        icon={MessageSquare}
                                    />
                                    <ModeOption
                                        mode="learning"
                                        name="Learning Mode"
                                        desc="Structured breakdown & explanations"
                                        currentMode={chatMode}
                                        onSelect={setChatMode}
                                        icon={GraduationCap}
                                    />
                                    <ModeOption
                                        mode="deep-search"
                                        name="Deep Search"
                                        desc="Web research & analysis"
                                        currentMode={chatMode}
                                        onSelect={setChatMode}
                                        icon={Microscope}
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Helpers
function TabBtn({ children, active, onClick, icon: Icon }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-1 py-3 text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-2 transition-colors relative",
                active ? "text-[var(--text-accent)] bg-[#1a1a1a]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
        >
            <Icon size={14} />
            {children}
            {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--text-accent)]" />}
        </button>
    );
}

function ModelOption({ id, name, desc, currentId, onSelect, icon: Icon }: any) {
    const isSelected = currentId === id;
    return (
        <button
            onClick={() => onSelect(id)}
            className={cn(
                "w-full flex items-center gap-4 p-3 rounded-lg border text-left transition-all active:scale-[0.98]",
                isSelected
                    ? "bg-[var(--text-accent)]/10 border-[var(--text-accent)]"
                    : "bg-[#1a1a1a] border-[#333]"
            )}
        >
            <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border",
                isSelected
                    ? "bg-[var(--text-accent)] text-black border-[var(--text-accent)]"
                    : "bg-[#222] text-[var(--text-secondary)] border-[#333]"
            )}>
                <Icon size={20} />
            </div>
            <div>
                <div className={cn("text-sm font-bold uppercase tracking-wide", isSelected ? "text-[var(--text-accent)]" : "text-[#eee]")}>{name}</div>
                <div className="text-[11px] text-[#888]">{desc}</div>
            </div>
            {isSelected && <div className="ml-auto w-2 h-2 rounded-full bg-[var(--text-accent)] shadow-[0_0_10px_var(--text-accent)]" />}
        </button>
    );
}

function ModeOption({ mode, name, desc, currentMode, onSelect, icon: Icon }: any) {
    const isSelected = currentMode === mode;
    return (
        <button
            onClick={() => onSelect(mode)}
            className={cn(
                "w-full flex items-center gap-4 p-3 rounded-lg border text-left transition-all active:scale-[0.98]",
                isSelected
                    ? "bg-[var(--text-accent)]/10 border-[var(--text-accent)]"
                    : "bg-[#1a1a1a] border-[#333]"
            )}
        >
            <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border",
                isSelected
                    ? "bg-[var(--text-accent)] text-black border-[var(--text-accent)]"
                    : "bg-[#222] text-[var(--text-secondary)] border-[#333]"
            )}>
                <Icon size={20} />
            </div>
            <div>
                <div className={cn("text-sm font-bold uppercase tracking-wide", isSelected ? "text-[var(--text-accent)]" : "text-[#eee]")}>{name}</div>
                <div className="text-[11px] text-[#888]">{desc}</div>
            </div>
        </button>
    );
}

