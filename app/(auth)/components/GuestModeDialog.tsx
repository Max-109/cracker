'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCircle, AlertTriangle, ArrowRight, User } from 'lucide-react';
import { useAuth } from '@/app/components/AuthContext';
import { cn } from '@/lib/utils';

interface GuestModeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GuestModeDialog({ open, onOpenChange }: GuestModeDialogProps) {
    const [login, setLogin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(false);
    const router = useRouter();
    const { refreshAuth } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[GuestModeDialog] handleSubmit called');
        if (!login.trim()) {
            setError('Please enter a login name');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            console.log('[GuestModeDialog] Calling /api/auth/guest with login:', login.trim().toLowerCase());
            const response = await fetch('/api/auth/guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: login.trim().toLowerCase() }),
            });

            const data = await response.json();
            console.log('[GuestModeDialog] API response:', response.status, data);

            if (!response.ok) {
                setError(data.error || 'Failed to sign in as guest');
                return;
            }

            // Successfully signed in as guest - refresh auth state and navigate
            console.log('[GuestModeDialog] Guest login successful, calling refreshAuth...');
            await refreshAuth();
            console.log('[GuestModeDialog] refreshAuth completed, navigating...');
            onOpenChange(false); // Close dialog
            router.push('/');
            router.refresh();
        } catch (err) {
            console.error('[GuestModeDialog] Error:', err);
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setLogin('');
        setError('');
        onOpenChange(false);
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleClose}
        >
            <div
                className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] w-[90%] max-w-[360px] animate-in zoom-in-95 fade-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[#0f0f0f]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/10">
                            <UserCircle size={16} className="text-[var(--text-accent)]" />
                        </div>
                        <div>
                            <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--text-primary)] block">
                                Guest Mode
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
                                No password required
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 border flex items-start gap-3" style={{ borderColor: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.1)' }}>
                            <div className="w-6 h-6 flex items-center justify-center border flex-shrink-0" style={{ borderColor: 'rgba(248, 113, 113, 0.3)', backgroundColor: 'rgba(248, 113, 113, 0.1)' }}>
                                <AlertTriangle size={12} style={{ color: '#f87171' }} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#f87171' }}>Error</p>
                                <p className="text-[11px] mt-0.5" style={{ color: '#fca5a5' }}>{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Login Input */}
                    <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-secondary)] flex items-center gap-2 font-semibold">
                            <User size={10} className={cn(
                                "transition-colors",
                                focusedField && "text-[var(--text-accent)]"
                            )} />
                            Guest Login
                        </label>
                        <div className={cn(
                            "border bg-[#1a1a1a] transition-all duration-150",
                            focusedField
                                ? "border-[var(--text-accent)]"
                                : "border-[var(--border-color)] hover:border-[var(--text-accent)]/30"
                        )}>
                            <input
                                type="text"
                                value={login}
                                onChange={(e) => setLogin(e.target.value)}
                                onFocus={() => setFocusedField(true)}
                                onBlur={() => setFocusedField(false)}
                                placeholder="Enter your username"
                                autoFocus
                                className="w-full bg-transparent px-3 py-3 text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/40 tracking-wide"
                            />
                        </div>
                    </div>

                    {/* Warning Box */}
                    <div className="p-3 border border-amber-400/20 bg-amber-400/5 flex items-start gap-2">
                        <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-400/80 leading-relaxed">
                            <span className="font-semibold uppercase tracking-wider text-[10px] block mb-1">Data not secure</span>
                            Anyone with this login name can access your chats, settings, and data. Don&apos;t use guest mode for sensitive information.
                        </p>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-[var(--border-color)] bg-[#0f0f0f] flex gap-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 py-2.5 text-[10px] uppercase tracking-[0.14em] font-bold border border-[var(--border-color)] bg-[#1a1a1a] text-[var(--text-primary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)] transition-all duration-150"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={isLoading || !login.trim()}
                        className={cn(
                            "flex-1 py-2.5 text-[10px] uppercase tracking-[0.14em] font-bold border transition-all duration-150 flex items-center justify-center gap-2",
                            isLoading || !login.trim()
                                ? "bg-[#1a1a1a] text-[var(--text-secondary)] border-[var(--border-color)] cursor-not-allowed"
                                : "bg-[var(--text-accent)] text-black border-[var(--text-accent)] hover:bg-transparent hover:text-[var(--text-accent)]"
                        )}
                    >
                        {isLoading ? (
                            <>
                                <div className="relative w-3 h-3">
                                    <div className="absolute inset-0 border border-current animate-spin" style={{ animationDuration: '1s' }} />
                                </div>
                                <span>Signing in</span>
                            </>
                        ) : (
                            <>
                                Continue
                                <ArrowRight size={12} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
