import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { users, userSettings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const GUEST_SESSION_SECRET = new TextEncoder().encode(
    process.env.GUEST_SESSION_SECRET || 'guest-session-secret-key-change-in-production'
);

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const { login } = await request.json();

        if (!login || typeof login !== 'string') {
            return NextResponse.json(
                { error: 'Login name is required' },
                { status: 400 }
            );
        }

        const normalizedLogin = login.trim().toLowerCase();

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
        const token = await new SignJWT({
            sub: guestUser.id,
            isGuest: true,
            guestLogin: normalizedLogin,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('30d')
            .sign(GUEST_SESSION_SECRET);

        // Set the guest session cookie
        const cookieStore = await cookies();
        cookieStore.set('guest-session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
        });

        return NextResponse.json({
            success: true,
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
        cookieStore.delete('guest-session');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Guest logout error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
