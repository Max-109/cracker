import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/password';
import { APP_SESSION_COOKIE, createAuthToken, getSessionCookieOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const db = getDb();

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        isGuest: users.isGuest,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!user || user.isGuest || !verifyPassword(String(password), user.passwordHash)) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = await createAuthToken({
      id: user.id,
      email: user.email,
      isGuest: false,
    });

    const cookieStore = await cookies();
    cookieStore.set(APP_SESSION_COOKIE, token, getSessionCookieOptions());

    return NextResponse.json({
      success: true,
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
