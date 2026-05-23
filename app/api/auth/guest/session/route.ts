import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser?.isGuest) {
      // No guest session is a normal auth probe result, not a request failure.
      return NextResponse.json({ user: null });
    }

    const db = getDb();
    const [guestUser] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isGuest: users.isGuest,
        guestLogin: users.guestLogin,
      })
      .from(users)
      .where(eq(users.id, authUser.id));

    if (!guestUser?.isGuest) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: guestUser });
  } catch (error) {
    console.error('Guest session check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
