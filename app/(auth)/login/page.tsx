'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Mail, Lock, AlertTriangle, Sparkles, ArrowRight, Fingerprint, UserCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { AuthBackground } from '../components/AuthBackground';
import { FloatingIcons } from '../components/FeatureShowcase';
import { GuestModeDialog } from '../components/GuestModeDialog';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [isPageMounted, setIsPageMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setIsPageMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToRegister = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsExiting(true);
    setTimeout(() => {
      router.push('/register');
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4 relative overflow-hidden">
      <AuthBackground />
      <FloatingIcons />

      <div className="flex items-center justify-center w-full relative z-10">
        <div className={cn(
          "w-full max-w-[400px] transition-all duration-500",
          isPageMounted && !isExiting ? "auth-page-enter" : "",
          isExiting ? "auth-page-exit" : ""
        )}>
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="inline-block relative group">
              {/* Outer glow ring - animated */}
              <div className="absolute -inset-4 border border-[var(--text-accent)]/10 group-hover:border-[var(--text-accent)]/30 transition-colors duration-500" />
              <div className="absolute -inset-6 border border-[var(--text-accent)]/5 group-hover:border-[var(--text-accent)]/15 transition-colors duration-700" />

              {/* Main logo */}
              <div className="w-16 h-16 border-2 border-[var(--text-accent)] bg-[var(--text-accent)]/10 flex items-center justify-center relative overflow-hidden group-hover:bg-[var(--text-accent)]/20 transition-colors">
                <Sparkles size={26} className="text-[var(--text-accent)] relative z-10" />
                {/* Inner scan effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--text-accent)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity animate-scanline" style={{ animationDuration: '2s' }} />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mt-6">
              Cracker
            </h1>
            <p className="text-[10px] text-[var(--text-secondary)] mt-2 uppercase tracking-[0.3em]">
              AI Chat Interface
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] overflow-hidden auth-card-shimmer">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[#0f0f0f]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/10 relative">
                  <LogIn size={16} className="text-[var(--text-accent)]" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--text-primary)] block">
                    Sign In
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
                    Access your account
                  </span>
                </div>
                {/* Status indicator */}
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-[var(--text-accent)] animate-pulse" />
                  <span className="text-[8px] uppercase tracking-wider text-[var(--text-accent)]">Ready</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5 auth-field-stagger">
              {/* Error Message */}
              {error && (
                <div className="p-3 border flex items-start gap-3" style={{ borderColor: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.1)' }}>
                  <div className="w-6 h-6 flex items-center justify-center border flex-shrink-0" style={{ borderColor: 'rgba(248, 113, 113, 0.3)', backgroundColor: 'rgba(248, 113, 113, 0.1)' }}>
                    <AlertTriangle size={12} style={{ color: '#f87171' }} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#f87171' }}>Authentication Failed</p>
                    <p className="text-[11px] mt-0.5" style={{ color: '#fca5a5' }}>{error}</p>
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-secondary)] flex items-center gap-2 font-semibold">
                  <Mail size={10} className={cn(
                    "transition-colors",
                    focusedField === 'email' && "text-[var(--text-accent)]"
                  )} />
                  Email Address
                </label>
                <div className={cn(
                  "border bg-[#1a1a1a] transition-all duration-150",
                  focusedField === 'email'
                    ? "border-[var(--text-accent)] input-focused"
                    : "border-[var(--border-color)] hover:border-[var(--text-accent)]/30"
                )}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="your@email.com"
                    required
                    className="w-full bg-transparent px-3 py-3 text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/40 tracking-wide"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-secondary)] flex items-center gap-2 font-semibold">
                  <Lock size={10} className={cn(
                    "transition-colors",
                    focusedField === 'password' && "text-[var(--text-accent)]"
                  )} />
                  Password
                </label>
                <div className={cn(
                  "border bg-[#1a1a1a] transition-all duration-150",
                  focusedField === 'password'
                    ? "border-[var(--text-accent)] input-focused"
                    : "border-[var(--border-color)] hover:border-[var(--text-accent)]/30"
                )}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-transparent px-3 py-3 text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/40 tracking-wide"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full py-3.5 text-xs uppercase tracking-[0.16em] font-bold transition-all duration-150 border flex items-center justify-center gap-2 group relative overflow-hidden",
                  isLoading
                    ? "bg-[#1a1a1a] text-[var(--text-secondary)] border-[var(--border-color)] cursor-not-allowed"
                    : "bg-[var(--text-accent)] text-black border-[var(--text-accent)] hover:bg-transparent hover:text-[var(--text-accent)] hover:shadow-[0_0_20px_-5px_var(--text-accent)]"
                )}
              >
                {isLoading ? (
                  <>
                    {/* Orbital Loading Animation */}
                    <div className="relative w-4 h-4">
                      <div className="absolute inset-0 border border-[var(--text-accent)]/30 auth-orbit" />
                      <div className="absolute top-0 left-1/2 w-1 h-1 bg-[var(--text-accent)] -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <span>Authenticating</span>
                    {/* Typing dots */}
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1 h-1 bg-current auth-typing-dot"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[var(--border-color)] bg-[#0f0f0f] space-y-3">
              {/* Guest Mode Button */}
              <button
                type="button"
                onClick={() => setGuestDialogOpen(true)}
                className="w-full py-2.5 text-[10px] uppercase tracking-[0.14em] font-bold border border-[var(--border-color)] bg-[#1a1a1a] text-[var(--text-secondary)] hover:border-[var(--text-accent)]/50 hover:text-[var(--text-accent)] transition-all duration-150 flex items-center justify-center gap-2 group"
              >
                <UserCircle size={14} className="group-hover:text-[var(--text-accent)] transition-colors" />
                Continue as Guest
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--border-color)]" />
                <span className="text-[8px] uppercase tracking-wider text-[var(--text-secondary)]">or</span>
                <div className="flex-1 h-px bg-[var(--border-color)]" />
              </div>

              {/* Register Link */}
              <p className="text-[10px] text-[var(--text-secondary)] text-center">
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  onClick={handleNavigateToRegister}
                  className="text-[var(--text-accent)] hover:underline font-semibold uppercase tracking-wider inline-flex items-center gap-1 group"
                >
                  Register
                  <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </p>
            </div>
          </div>

          {/* Badge */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border border-[var(--border-color)] bg-[#1a1a1a] flex items-center justify-center">
              <Fingerprint size={12} className="text-[var(--text-secondary)]" />
            </div>
            <span className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Your AI Assistant
            </span>
          </div>
        </div>
      </div>

      {/* Guest Mode Dialog */}
      <GuestModeDialog open={guestDialogOpen} onOpenChange={setGuestDialogOpen} />
    </div>
  );
}

