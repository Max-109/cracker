'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Mail, Lock, AlertTriangle, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const router = useRouter();
  const supabase = createClient();

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

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(var(--text-accent) 1px, transparent 1px), linear-gradient(90deg, var(--text-accent) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      
      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-block relative">
            {/* Outer glow ring */}
            <div className="absolute -inset-3 border border-[var(--text-accent)]/20 animate-pulse" />
            <div className="w-16 h-16 border-2 border-[var(--text-accent)] bg-[var(--text-accent)]/10 flex items-center justify-center">
              <Sparkles size={26} className="text-[var(--text-accent)]" />
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
        <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[#0f0f0f]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/10">
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
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 border border-red-400/30 bg-red-400/5 flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center border border-red-400/30 bg-red-400/10 flex-shrink-0">
                  <AlertTriangle size={12} className="text-red-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">Authentication Failed</p>
                  <p className="text-[11px] text-red-400/80 mt-0.5">{error}</p>
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
                  ? "border-[var(--text-accent)] shadow-[0_0_15px_-5px_var(--text-accent)]" 
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
                  ? "border-[var(--text-accent)] shadow-[0_0_15px_-5px_var(--text-accent)]" 
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
                "w-full py-3.5 text-xs uppercase tracking-[0.16em] font-bold transition-all duration-150 border flex items-center justify-center gap-2 group",
                isLoading
                  ? "bg-[#1a1a1a] text-[var(--text-secondary)] border-[var(--border-color)] cursor-not-allowed"
                  : "bg-[var(--text-accent)] text-black border-[var(--text-accent)] hover:bg-transparent hover:text-[var(--text-accent)] hover:shadow-[0_0_20px_-5px_var(--text-accent)]"
              )}
            >
              {isLoading ? (
                <>
                  <Zap size={14} className="animate-pulse" />
                  Authenticating...
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
          <div className="px-5 py-4 border-t border-[var(--border-color)] bg-[#0f0f0f]">
            <p className="text-[10px] text-[var(--text-secondary)] text-center">
              Don&apos;t have an account?{' '}
              <Link 
                href="/register" 
                className="text-[var(--text-accent)] hover:underline font-semibold uppercase tracking-wider"
              >
                Register
              </Link>
            </p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="w-1 h-1 bg-[var(--text-accent)]" />
          <span className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Secured with Supabase Auth
          </span>
          <div className="w-1 h-1 bg-[var(--text-accent)]" />
        </div>
      </div>
    </div>
  );
}
