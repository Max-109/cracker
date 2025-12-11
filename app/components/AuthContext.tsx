'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  isGuest?: boolean;
  guestLogin?: string;
}

// Guest user type (partial User type for compatibility)
interface GuestUser {
  id: string;
  email: string;
  isGuest: true;
}

interface AuthContextType {
  user: User | GuestUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isGuest: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isGuest: false,
  signOut: async () => { },
  refreshProfile: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | GuestUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const supabase = createClient();

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
    try {
      const res = await fetch('/api/auth/guest/session');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
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
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to check guest session:', error);
    }
    return false;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const getUser = async () => {
      // First check for Supabase auth user
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      if (supabaseUser) {
        setUser(supabaseUser);
        await fetchProfile(supabaseUser.id);
        setIsLoading(false);
        return;
      }

      // If no Supabase user, check for guest session
      const hasGuestSession = await checkGuestSession();
      if (!hasGuestSession) {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
          setIsGuest(false);
        } else if (!isGuest) {
          // Only clear if not a guest user
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth, fetchProfile, checkGuestSession, isGuest]);

  const signOut = async () => {
    if (isGuest) {
      // Sign out guest user
      await fetch('/api/auth/guest', { method: 'DELETE' });
    } else {
      // Sign out Supabase user
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setIsGuest(false);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, isGuest, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
