import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const GUEST_SESSION_SECRET = new TextEncoder().encode(
    process.env.GUEST_SESSION_SECRET || 'guest-session-secret-key-change-in-production'
);

export async function GET() {
    try {
        const db = getDb();
        const cookieStore = await cookies();
        const token = cookieStore.get('guest-session')?.value;

        if (!token) {
            return NextResponse.json({ user: null });
        }

        try {
            const { payload } = await jwtVerify(token, GUEST_SESSION_SECRET);

            if (!payload.sub || !payload.isGuest) {
                return NextResponse.json({ user: null });
            }

            // Fetch the guest user from the database
            const [guestUser] = await db
                .select({
                    id: users.id,
                    email: users.email,
                    name: users.name,
                    isGuest: users.isGuest,
                    guestLogin: users.guestLogin,
                })
                .from(users)
                .where(and(
                    eq(users.id, payload.sub as string),
                    eq(users.isGuest, true)
                ));

            if (!guestUser) {
                // Guest user not found, clear the cookie
                cookieStore.delete('guest-session');
                return NextResponse.json({ user: null });
            }

            return NextResponse.json({ user: guestUser });
        } catch {
            // Invalid token, clear the cookie
            cookieStore.delete('guest-session');
            return NextResponse.json({ user: null });
        }
    } catch (error) {
        console.error('Guest session check error:', error);
        return NextResponse.json({ user: null });
    }
}
