import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      // No active session is a normal app state on first page load.
      // Return 200 so browsers do not log a noisy failed resource for auth probing.
      return NextResponse.json({ user: null });
    }

    const db = getDb();
    const [profile] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isAdmin: users.isAdmin,
        isGuest: users.isGuest,
        guestLogin: users.guestLogin,
      })
      .from(users)
      .where(eq(users.id, authUser.id));

    if (!profile) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        isAdmin: profile.isAdmin,
        isGuest: profile.isGuest,
        guestLogin: profile.guestLogin,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
