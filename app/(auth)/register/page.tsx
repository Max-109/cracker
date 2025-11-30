'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Mail, Lock, User, Ticket, AlertTriangle, Sparkles, Check, ArrowRight, Shield, ArrowLeft, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthBackground } from '../components/AuthBackground';
import { FloatingIcons } from '../components/FeatureShowcase';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isPageMounted, setIsPageMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsPageMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          invitationCode: invitationCode.replace(/\s/g, ''),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          router.push('/login');
        }, 300);
      }, 2000);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsExiting(true);
    setTimeout(() => {
      router.push('/login');
    }, 300);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4 relative overflow-hidden">
        <AuthBackground />
        <FloatingIcons />
        
        <div className={cn(
          "w-full max-w-[400px] relative z-10",
          isPageMounted && !isExiting ? "auth-page-enter" : "",
          isExiting ? "auth-page-exit" : ""
        )}>
          <div className="bg-[var(--bg-sidebar)] border border-[var(--text-accent)] overflow-hidden animate-success-pulse">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--text-accent)]/30 bg-[var(--text-accent)]/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center border border-[var(--text-accent)] bg-[var(--text-accent)] text-black">
                  <Check size={16} />
                </div>
                <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--text-accent)]">
                  Registration Complete
                </span>
              </div>
            </div>
            
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 border-2 border-[var(--text-accent)] bg-[var(--text-accent)]/20 mb-6 relative">
                <Check size={36} className="text-[var(--text-accent)]" />
                {/* Rotating ring */}
                <div className="absolute inset-0 border-2 border-[var(--text-accent)]/30 auth-orbit" style={{ animationDuration: '3s' }} />
              </div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
                Account Created
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">
                Redirecting to login
              </p>
              
              {/* Animated progress bars */}
              <div className="flex items-center justify-center gap-1 mt-6">
                {[1, 2, 3, 4, 5].map((bar) => (
                  <div
                    key={bar}
                    className="w-2 bg-[var(--text-accent)]"
                    style={{ 
                      height: `${bar * 6}px`,
                      animation: `auth-typing 1.2s ease-in-out infinite`,
                      animationDelay: `${bar * 100}ms`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4 relative overflow-hidden">
      <AuthBackground />
      
      <FloatingIcons />
      
      <div className="flex items-center justify-center w-full relative z-10">
        <div className={cn(
          "w-full max-w-[420px] transition-all duration-500",
          isPageMounted && !isExiting ? "auth-page-enter" : "",
          isExiting ? "auth-page-exit" : ""
        )}>
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="inline-block relative group">
              {/* Outer glow rings */}
              <div className="absolute -inset-4 border border-[var(--text-accent)]/10 group-hover:border-[var(--text-accent)]/30 transition-colors duration-500" />
              <div className="absolute -inset-6 border border-[var(--text-accent)]/5 group-hover:border-[var(--text-accent)]/15 transition-colors duration-700" />
              
              <div className="w-16 h-16 border-2 border-[var(--text-accent)] bg-[var(--text-accent)]/10 flex items-center justify-center relative overflow-hidden group-hover:bg-[var(--text-accent)]/20 transition-colors">
                <Sparkles size={26} className="text-[var(--text-accent)] relative z-10" />
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

          {/* Register Card */}
          <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] overflow-hidden auth-card-shimmer">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[#0f0f0f]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/10">
                  <UserPlus size={16} className="text-[var(--text-accent)]" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--text-primary)] block">
                    Create Account
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
                    Invitation required
                  </span>
                </div>
                {/* Intensity bars */}
                <div className="ml-auto flex items-end gap-0.5 h-4">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={cn(
                        "w-1 bg-[var(--text-accent)]",
                        bar === 1 ? "h-1" : bar === 2 ? "h-2" : bar === 3 ? "h-3" : "h-4",
                        "opacity-60"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 auth-field-stagger">
              {/* Error Message */}
              {error && (
                <div className="p-3 border border-red-400/30 bg-red-400/5 flex items-start gap-3 auth-error-glitch">
                  <div className="w-6 h-6 flex items-center justify-center border border-red-400/30 bg-red-400/10 flex-shrink-0">
                    <AlertTriangle size={12} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">Registration Failed</p>
                    <p className="text-[11px] text-red-400/80 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Invitation Code - Highlighted */}
              <div className="space-y-2 p-3 border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/5 relative overflow-hidden">
                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-[var(--text-accent)]/30" />
                
                <label className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-accent)] flex items-center gap-2 font-bold">
                  <Ticket size={10} />
                  Invitation Code
                  <span className="ml-auto px-1.5 py-0.5 bg-[var(--text-accent)]/20 border border-[var(--text-accent)]/50 text-[8px]">
                    REQUIRED
                  </span>
                </label>
                <div className={cn(
                  "border bg-[#1a1a1a] transition-all duration-150",
                  focusedField === 'code' 
                    ? "border-[var(--text-accent)] input-focused" 
                    : "border-[var(--text-accent)]/30 hover:border-[var(--text-accent)]/50"
                )}>
                  <input
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    onFocus={() => setFocusedField('code')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    required
                    maxLength={32}
                    className="w-full bg-transparent px-3 py-3 text-sm text-[var(--text-accent)] focus:outline-none placeholder:text-[var(--text-accent)]/20 font-mono tracking-[0.15em]"
                  />
                </div>
                <p className="text-[9px] text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Shield size={9} />
                  32-character code from administrator
                </p>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-secondary)] flex items-center gap-2 font-semibold">
                  <User size={10} className={cn(
                    "transition-colors",
                    focusedField === 'name' && "text-[var(--text-accent)]"
                  )} />
                  Display Name
                  <span className="ml-auto text-[8px] opacity-50">Optional</span>
                </label>
                <div className={cn(
                  "border bg-[#1a1a1a] transition-all duration-150",
                  focusedField === 'name' 
                    ? "border-[var(--text-accent)] input-focused" 
                    : "border-[var(--border-color)] hover:border-[var(--text-accent)]/30"
                )}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="How should we call you?"
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/40 tracking-wide"
                  />
                </div>
              </div>

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
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/40 tracking-wide"
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
                  <span className="ml-auto text-[8px] opacity-50">Min 6 chars</span>
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
                    placeholder="Create a secure password"
                    required
                    minLength={6}
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/40 tracking-wide"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full py-3.5 text-xs uppercase tracking-[0.16em] font-bold transition-all duration-150 border flex items-center justify-center gap-2 group mt-2 relative overflow-hidden",
                  isLoading
                    ? "bg-[#1a1a1a] text-[var(--text-secondary)] border-[var(--border-color)] cursor-not-allowed"
                    : "bg-[var(--text-accent)] text-black border-[var(--text-accent)] hover:bg-transparent hover:text-[var(--text-accent)] hover:shadow-[0_0_20px_-5px_var(--text-accent)]"
                )}
              >
                {isLoading ? (
                  <>
                    <div className="relative w-4 h-4">
                      <div className="absolute inset-0 border border-[var(--text-accent)]/30 auth-orbit" />
                      <div className="absolute top-0 left-1/2 w-1 h-1 bg-[var(--text-accent)] -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <span>Creating Account</span>
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
                    Create Account
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[var(--border-color)] bg-[#0f0f0f]">
              <p className="text-[10px] text-[var(--text-secondary)] text-center">
                Already have an account?{' '}
                <Link 
                  href="/login"
                  onClick={handleNavigateToLogin}
                  className="text-[var(--text-accent)] hover:underline font-semibold uppercase tracking-wider inline-flex items-center gap-1 group"
                >
                  <ArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" />
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          {/* Security Badge - Redesigned */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border border-[var(--border-color)] bg-[#1a1a1a] flex items-center justify-center">
                <Shield size={12} className="text-[var(--text-accent)]" />
              </div>
              <div className="h-px w-8 bg-gradient-to-r from-[var(--border-color)] to-transparent" />
              <div className="w-6 h-6 border border-[var(--border-color)] bg-[#1a1a1a] flex items-center justify-center">
                <Fingerprint size={12} className="text-[var(--text-secondary)]" />
              </div>
            </div>
            <span className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Invitation-Only Access
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
