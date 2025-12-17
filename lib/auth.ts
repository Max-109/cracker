import { createClient } from '@/lib/supabase/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const GUEST_SESSION_SECRET = new TextEncoder().encode(
    process.env.GUEST_SESSION_SECRET || 'guest-session-secret-key-change-in-production'
);

interface AuthUser {
    id: string;
    email: string;
    isGuest: boolean;
}

/**
 * Get the authenticated user from either Supabase Auth or Guest session.
 * Returns null if no valid authentication is found.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
    // First, try Supabase auth
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (supabaseUser) {
        return {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            isGuest: false,
        };
    }

    // If no Supabase user, check for guest session
    const cookieStore = await cookies();
    const token = cookieStore.get('guest-session')?.value;

    if (!token) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, GUEST_SESSION_SECRET);

        if (payload.sub && payload.isGuest) {
            return {
                id: payload.sub as string,
                email: `guest-${payload.guestLogin}@guest.local`,
                isGuest: true,
            };
        }
    } catch {
        // Invalid token
        return null;
    }

    return null;
}
