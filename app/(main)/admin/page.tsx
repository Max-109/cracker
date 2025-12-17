'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, Users, Ticket, Plus, Copy, Check, ArrowLeft,
  User, Mail, Calendar, AlertTriangle, Sparkles, Zap, Clock,
  Power, PowerOff, ShieldCheck, ShieldOff
} from 'lucide-react';
import { useAuth } from '@/app/components/AuthContext';
import { cn } from '@/lib/utils';

interface InvitationCode {
  id: string;
  code: string;
  createdAt: string;
  usedAt: string | null;
  creatorName: string | null;
  usedByName: string | null;
  usedByEmail: string | null;
  disabled: boolean;
}

interface UserData {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const { profile, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'users' | 'codes'>('codes');
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [togglingCodeId, setTogglingCodeId] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [codesRes, usersRes] = await Promise.all([
        fetch('/api/invitation-codes'),
        fetch('/api/admin/users'),
      ]);

      if (!codesRes.ok || !usersRes.ok) {
        if (codesRes.status === 403 || usersRes.status === 403) {
          setError('Admin access required');
          return;
        }
        throw new Error('Failed to fetch data');
      }

      const [codesData, usersData] = await Promise.all([
        codesRes.json(),
        usersRes.json(),
      ]);

      setCodes(codesData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && profile) {
      if (!profile.isAdmin) {
        router.push('/');
        return;
      }
      fetchData();
    }
  }, [authLoading, profile, router, fetchData]);

  const createCode = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/invitation-codes', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create code');
      await fetchData();
    } catch (err) {
      console.error('Failed to create code:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleCodeDisabled = async (codeId: string, currentDisabled: boolean) => {
    setTogglingCodeId(codeId);
    try {
      const res = await fetch('/api/invitation-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: codeId, disabled: !currentDisabled }),
      });
      if (!res.ok) throw new Error('Failed to update code');
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle code:', err);
    } finally {
      setTogglingCodeId(null);
    }
  };

  const toggleUserAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setTogglingUserId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isAdmin: !currentIsAdmin }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update user');
        return;
      }
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle admin:', err);
    } finally {
      setTogglingUserId(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Stats
  const availableCodes = codes.filter(c => !c.usedAt && !c.disabled).length;
  const usedCodes = codes.filter(c => c.usedAt).length;
  const disabledCodes = codes.filter(c => c.disabled && !c.usedAt).length;
  const adminUsers = users.filter(u => u.isAdmin).length;

  if (authLoading || (profile && !profile.isAdmin)) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="flex items-end gap-0.5 h-6">
            {[1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                className="w-1.5 bg-[var(--text-accent)] animate-pulse"
                style={{ 
                  height: `${bar * 6}px`,
                  animationDelay: `${bar * 100}ms` 
                }}
              />
            ))}
          </div>
          <span className="text-[var(--text-secondary)] text-sm uppercase tracking-wider">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  if (error === 'Admin access required') {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4">
        <div className="bg-[var(--bg-sidebar)] border border-red-400/30 max-w-md overflow-hidden">
          <div className="px-4 py-3 border-b border-red-400/20 bg-red-400/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center border border-red-400/30 bg-red-400/10">
                <AlertTriangle size={16} className="text-red-400" />
              </div>
              <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-red-400">
                Access Denied
              </span>
            </div>
          </div>
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              You don&apos;t have permission to access the admin dashboard.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2.5 bg-[var(--text-accent)] text-black text-xs uppercase tracking-wider font-bold border border-[var(--text-accent)] hover:bg-transparent hover:text-[var(--text-accent)] transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/')}
            className="w-10 h-10 flex items-center justify-center border border-[var(--border-color)] bg-[#1a1a1a] text-[var(--text-secondary)] hover:border-[var(--text-accent)] hover:text-[var(--text-accent)] transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center border border-[var(--text-accent)] bg-[var(--text-accent)]/10">
              <Shield size={20} className="text-[var(--text-accent)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Admin Dashboard
              </h1>
              <p className="text-[9px] text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                Manage users & invitation codes
              </p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Users', value: users.length, icon: Users, level: 4 },
            { label: 'Admins', value: adminUsers, icon: Shield, level: 3 },
            { label: 'Available Codes', value: availableCodes, icon: Ticket, level: 2 },
            { label: 'Used / Disabled', value: `${usedCodes} / ${disabledCodes}`, icon: Check, level: 1 },
          ].map(({ label, value, icon: Icon, level }) => (
            <div 
              key={label}
              className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] p-4 group hover:border-[var(--text-accent)]/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center border transition-all",
                  "border-[var(--border-color)] bg-[#1a1a1a] text-[var(--text-secondary)]",
                  "group-hover:border-[var(--text-accent)]/50 group-hover:text-[var(--text-accent)]"
                )}>
                  <Icon size={14} />
                </div>
                <div className="flex items-end gap-0.5 h-4">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={cn(
                        "w-1 bg-[var(--text-accent)]",
                        bar === 1 ? "h-1" : bar === 2 ? "h-2" : bar === 3 ? "h-3" : "h-4",
                        bar <= level ? "opacity-60" : "opacity-10"
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="text-2xl font-bold text-[var(--text-accent)]">{value}</div>
              <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">{label}</div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'codes' as const, icon: Ticket, label: 'Invitation Codes', count: codes.length },
            { id: 'users' as const, icon: Users, label: 'Users', count: users.length },
          ].map(({ id, icon: Icon, label, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-wider font-semibold transition-all border-l-2",
                activeTab === id
                  ? "bg-[var(--text-accent)]/10 border-l-[var(--text-accent)] text-[var(--text-accent)]"
                  : "bg-[#1a1a1a] border-l-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#1e1e1e]"
              )}
            >
              <Icon size={14} />
              {label}
              <span className={cn(
                "ml-1 px-1.5 py-0.5 text-[9px] border",
                activeTab === id
                  ? "bg-[var(--text-accent)]/20 border-[var(--text-accent)]/50 text-[var(--text-accent)]"
                  : "bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)]"
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Content Card */}
        <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] overflow-hidden">
          {activeTab === 'codes' && (
            <>
              {/* Codes Header */}
              <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[#0f0f0f] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 flex items-center justify-center border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/10">
                    <Ticket size={14} className="text-[var(--text-accent)]" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--text-primary)] block">
                      Invitation Codes
                    </span>
                    <span className="text-[9px] text-[var(--text-secondary)]">
                      {availableCodes} available, {usedCodes} used, {disabledCodes} disabled
                    </span>
                  </div>
                </div>
                <button
                  onClick={createCode}
                  disabled={isCreating}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-wider font-bold transition-all border",
                    isCreating
                      ? "bg-[#1a1a1a] text-[var(--text-secondary)] border-[var(--border-color)]"
                      : "bg-[var(--text-accent)] text-black border-[var(--text-accent)] hover:bg-transparent hover:text-[var(--text-accent)]"
                  )}
                >
                  {isCreating ? (
                    <Zap size={12} className="animate-pulse" />
                  ) : (
                    <Plus size={12} />
                  )}
                  {isCreating ? 'Creating...' : 'Generate Code'}
                </button>
              </div>

              {/* Codes List */}
              <div className="divide-y divide-[var(--border-color)]">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Zap size={14} className="text-[var(--text-accent)] animate-pulse" />
                      <span className="text-sm text-[var(--text-secondary)]">Loading...</span>
                    </div>
                  </div>
                ) : codes.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 border border-dashed border-[var(--border-color)] flex items-center justify-center">
                      <Ticket size={20} className="text-[var(--text-secondary)]" />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">No invitation codes yet</p>
                    <p className="text-[10px] text-[var(--text-secondary)]/50 mt-1 uppercase tracking-wider">
                      Click &quot;Generate Code&quot; to create one
                    </p>
                  </div>
                ) : (
                  codes.map((code) => (
                    <div
                      key={code.id}
                      className={cn(
                        "p-4 flex items-center justify-between gap-4 group hover:bg-[#1a1a1a]/50 transition-all",
                        (code.usedAt || code.disabled) && "opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Status Icon */}
                        <div className={cn(
                          "w-10 h-10 flex items-center justify-center border flex-shrink-0",
                          code.usedAt
                            ? "border-[var(--text-secondary)]/30 bg-[var(--text-secondary)]/5"
                            : code.disabled
                            ? "border-red-400/30 bg-red-400/5"
                            : "border-[var(--text-accent)]/30 bg-[var(--text-accent)]/10"
                        )}>
                          {code.usedAt ? (
                            <Check size={16} className="text-[var(--text-secondary)]" />
                          ) : code.disabled ? (
                            <PowerOff size={16} className="text-red-400" />
                          ) : (
                            <Sparkles size={16} className="text-[var(--text-accent)]" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <code className={cn(
                              "text-sm font-mono tracking-wider",
                              code.usedAt ? "text-[var(--text-secondary)]" : code.disabled ? "text-red-400/70" : "text-[var(--text-accent)]"
                            )}>
                              {code.code}
                            </code>
                            {code.usedAt ? (
                              <span className="px-1.5 py-0.5 text-[8px] uppercase tracking-wider bg-[var(--text-secondary)]/10 text-[var(--text-secondary)] border border-[var(--text-secondary)]/20">
                                Used
                              </span>
                            ) : code.disabled ? (
                              <span className="px-1.5 py-0.5 text-[8px] uppercase tracking-wider bg-red-400/10 text-red-400 border border-red-400/20">
                                Disabled
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[8px] uppercase tracking-wider bg-[var(--text-accent)]/20 text-[var(--text-accent)] border border-[var(--text-accent)]/30">
                                Available
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-[var(--text-secondary)] flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              {formatDate(code.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {formatTime(code.createdAt)}
                            </span>
                            {code.usedByEmail && (
                              <span className="flex items-center gap-1">
                                <User size={10} />
                                {code.usedByName || code.usedByEmail}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Toggle Disabled Button - only for unused codes */}
                        {!code.usedAt && (
                          <button
                            onClick={() => toggleCodeDisabled(code.id, code.disabled)}
                            disabled={togglingCodeId === code.id}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold border transition-all",
                              togglingCodeId === code.id
                                ? "opacity-50 cursor-not-allowed"
                                : code.disabled
                                ? "border-[var(--text-accent)]/30 text-[var(--text-accent)] hover:bg-[var(--text-accent)]/10"
                                : "border-red-400/30 text-red-400 hover:bg-red-400/10"
                            )}
                            title={code.disabled ? 'Enable code' : 'Disable code'}
                          >
                            {code.disabled ? (
                              <>
                                <Power size={12} />
                                Enable
                              </>
                            ) : (
                              <>
                                <PowerOff size={12} />
                                Disable
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* Copy Button - only for available codes */}
                        {!code.usedAt && !code.disabled && (
                          <button
                            onClick={() => copyCode(code.code)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold border transition-all",
                              copiedCode === code.code
                                ? "border-[var(--text-accent)] bg-[var(--text-accent)] text-black"
                                : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-accent)] hover:text-[var(--text-accent)]"
                            )}
                          >
                            {copiedCode === code.code ? (
                              <>
                                <Check size={12} />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                Copy
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <>
              {/* Users Header */}
              <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[#0f0f0f]">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 flex items-center justify-center border border-[var(--text-accent)]/30 bg-[var(--text-accent)]/10">
                    <Users size={14} className="text-[var(--text-accent)]" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--text-primary)] block">
                      Registered Users
                    </span>
                    <span className="text-[9px] text-[var(--text-secondary)]">
                      {users.length} total, {adminUsers} admins
                    </span>
                  </div>
                </div>
              </div>

              {/* Users List */}
              <div className="divide-y divide-[var(--border-color)]">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Zap size={14} className="text-[var(--text-accent)] animate-pulse" />
                      <span className="text-sm text-[var(--text-secondary)]">Loading...</span>
                    </div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 border border-dashed border-[var(--border-color)] flex items-center justify-center">
                      <Users size={20} className="text-[var(--text-secondary)]" />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">No users yet</p>
                  </div>
                ) : (
                  users.map((userData) => (
                    <div 
                      key={userData.id} 
                      className="p-4 flex items-center justify-between gap-4 group hover:bg-[#1a1a1a]/50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className={cn(
                          "w-12 h-12 flex items-center justify-center border",
                          userData.isAdmin
                            ? "border-[var(--text-accent)] bg-[var(--text-accent)]/10"
                            : "border-[var(--border-color)] bg-[#1a1a1a]"
                        )}>
                          {userData.isAdmin ? (
                            <Shield size={18} className="text-[var(--text-accent)]" />
                          ) : (
                            <User size={18} className="text-[var(--text-secondary)]" />
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={cn(
                              "text-sm font-semibold",
                              userData.isAdmin ? "text-[var(--text-accent)]" : "text-[var(--text-primary)]"
                            )}>
                              {userData.name || 'Unnamed User'}
                            </span>
                            {userData.isAdmin && (
                              <span className="px-1.5 py-0.5 text-[8px] uppercase tracking-wider bg-[var(--text-accent)]/20 text-[var(--text-accent)] border border-[var(--text-accent)]/30 font-bold">
                                Admin
                              </span>
                            )}
                            {userData.id === user?.id && (
                              <span className="px-1.5 py-0.5 text-[8px] uppercase tracking-wider bg-[var(--text-secondary)]/10 text-[var(--text-secondary)] border border-[var(--text-secondary)]/20">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-[var(--text-secondary)] flex-wrap">
                            <span className="flex items-center gap-1">
                              <Mail size={10} />
                              {userData.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              Joined {formatDate(userData.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Toggle Admin Button */}
                        <button
                          onClick={() => toggleUserAdmin(userData.id, userData.isAdmin)}
                          disabled={togglingUserId === userData.id || userData.id === user?.id}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold border transition-all",
                            togglingUserId === userData.id || userData.id === user?.id
                              ? "opacity-50 cursor-not-allowed border-[var(--border-color)] text-[var(--text-secondary)]"
                              : userData.isAdmin
                              ? "border-red-400/30 text-red-400 hover:bg-red-400/10"
                              : "border-[var(--text-accent)]/30 text-[var(--text-accent)] hover:bg-[var(--text-accent)]/10"
                          )}
                          title={userData.id === user?.id ? 'Cannot modify yourself' : userData.isAdmin ? 'Remove admin' : 'Make admin'}
                        >
                          {userData.isAdmin ? (
                            <>
                              <ShieldOff size={12} />
                              Remove Admin
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={12} />
                              Make Admin
                            </>
                          )}
                        </button>
                        
                        {/* User level indicator */}
                        <div className="flex items-end gap-0.5 h-4">
                          {[1, 2, 3, 4].map((bar) => (
                            <div
                              key={bar}
                              className={cn(
                                "w-1 bg-[var(--text-accent)]",
                                bar === 1 ? "h-1" : bar === 2 ? "h-2" : bar === 3 ? "h-3" : "h-4",
                                bar <= (userData.isAdmin ? 4 : 2) 
                                  ? "opacity-60" 
                                  : "opacity-10"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="w-1 h-1 bg-[var(--text-accent)]" />
          <span className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Admin Panel v1.0
          </span>
          <div className="w-1 h-1 bg-[var(--text-accent)]" />
        </div>
      </div>
    </div>
  );
}
