'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  isGuest?: boolean;
  guestLogin?: string;
}

interface AuthUser {
  id: string;
  email: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isGuest: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isGuest: false,
  signOut: async () => { },
  refreshProfile: async () => { },
  refreshAuth: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/auth/profile?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setIsGuest(data.isGuest || false);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }, []);

  const checkGuestSession = useCallback(async () => {
    console.log('[AuthContext] checkGuestSession called');
    try {
      const res = await fetch('/api/auth/guest/session');
      console.log('[AuthContext] Guest session API response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[AuthContext] Guest session data:', data);
        if (data.user) {
          console.log('[AuthContext] Setting guest user:', data.user.id, data.user.name);
          setUser({
            id: data.user.id,
            email: data.user.email,
            isGuest: true,
          });
          setProfile({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            isAdmin: false,
            isGuest: true,
            guestLogin: data.user.guestLogin,
          });
          setIsGuest(true);
          console.log('[AuthContext] Guest user set successfully');
          return true;
        }
      }
    } catch (error) {
      console.error('[AuthContext] Failed to check guest session:', error);
    }
    console.log('[AuthContext] No guest session found');
    return false;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // Refresh auth state - checks both Supabase and guest sessions
  const refreshAuth = useCallback(async () => {
    console.log('[AuthContext] refreshAuth called');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            isGuest: data.user.isGuest || false,
          });
          setProfile(data.user);
          setIsGuest(data.user.isGuest || false);
          setIsLoading(false);
          return;
        }
      }
    } catch (error) {
      console.error('[AuthContext] Failed to refresh auth:', error);
    }

    setUser(null);
    setProfile(null);
    setIsGuest(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setProfile(null);
    setIsGuest(false);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, isGuest, signOut, refreshProfile, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
