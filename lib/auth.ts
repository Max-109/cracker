import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';

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
 * Supports both cookie-based auth (web) and Bearer token auth (mobile).
 * Returns null if no valid authentication is found.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
    // First, check for Authorization header (mobile app)
    const headerStore = await headers();
    const authHeader = headerStore.get('authorization');

    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);

        // Verify the token with Supabase
        try {
            const supabase = createSupabaseClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    global: {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    },
                }
            );

            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (user && !error) {
                return {
                    id: user.id,
                    email: user.email || '',
                    isGuest: false,
                };
            }
        } catch (e) {
            console.error('[Auth] Bearer token validation failed:', e);
        }
    }

    // Second, try Supabase auth via cookies (web)
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (supabaseUser) {
        return {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            isGuest: false,
        };
    }

    // If no Supabase user, check for guest session cookie
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
