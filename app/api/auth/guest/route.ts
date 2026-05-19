import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { users, userSettings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { createAuthToken, GUEST_SESSION_COOKIE, getSessionCookieOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const { login, loginName } = await request.json();
        const rawLogin = login ?? loginName;

        if (!rawLogin || typeof rawLogin !== 'string') {
            return NextResponse.json(
                { error: 'Login name is required' },
                { status: 400 }
            );
        }

        const normalizedLogin = rawLogin.trim().toLowerCase();

        if (normalizedLogin.length < 2) {
            return NextResponse.json(
                { error: 'Login name must be at least 2 characters' },
                { status: 400 }
            );
        }

        if (normalizedLogin.length > 50) {
            return NextResponse.json(
                { error: 'Login name must be at most 50 characters' },
                { status: 400 }
            );
        }

        // Check if guest user with this login already exists
        const [existingGuest] = await db
            .select()
            .from(users)
            .where(and(
                eq(users.isGuest, true),
                eq(users.guestLogin, normalizedLogin)
            ));

        let guestUser;

        if (existingGuest) {
            // Use existing guest user
            guestUser = existingGuest;
        } else {
            // Create new guest user
            const guestId = randomUUID();
            const guestEmail = `guest-${normalizedLogin}@guest.local`;

            const [newGuest] = await db
                .insert(users)
                .values({
                    id: guestId,
                    email: guestEmail,
                    name: normalizedLogin,
                    isGuest: true,
                    guestLogin: normalizedLogin,
                    isAdmin: false,
                })
                .returning();

            guestUser = newGuest;

            // Create default settings for the new guest user
            await db
                .insert(userSettings)
                .values({
                    userId: guestId,
                })
                .onConflictDoNothing();
        }

        // Create a JWT token for the guest session
        const token = await createAuthToken({
            id: guestUser.id,
            email: guestUser.email,
            isGuest: true,
            guestLogin: normalizedLogin,
        });

        // Set the guest session cookie
        const cookieStore = await cookies();
        cookieStore.set(GUEST_SESSION_COOKIE, token, getSessionCookieOptions());

        return NextResponse.json({
            success: true,
            token,
            userId: guestUser.id,
            loginName: normalizedLogin,
            user: {
                id: guestUser.id,
                email: guestUser.email,
                name: guestUser.name,
                isGuest: true,
                guestLogin: normalizedLogin,
            },
        });
    } catch (error) {
        console.error('Guest login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE - Sign out guest user
export async function DELETE() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete(GUEST_SESSION_COOKIE);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Guest logout error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
