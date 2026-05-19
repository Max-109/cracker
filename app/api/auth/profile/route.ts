import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { classifyDbError } from '@/lib/db-errors';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const requestedUserId = request.nextUrl.searchParams.get('userId');

  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const targetUserId = requestedUserId || authUser.id;

    if (targetUserId !== authUser.id) {
      const [currentProfile] = await db
        .select({ isAdmin: users.isAdmin })
        .from(users)
        .where(eq(users.id, authUser.id));

      if (!currentProfile?.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isAdmin: users.isAdmin,
        isGuest: users.isGuest,
        guestLogin: users.guestLogin,
      })
      .from(users)
      .where(eq(users.id, targetUserId));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    const classified = classifyDbError(error);
    if (classified.kind === 'quota_exceeded') {
      console.warn('Database quota exceeded while fetching profile.');
      return NextResponse.json({ error: classified.message, code: classified.code }, { status: classified.status });
    }
    console.error('Failed to fetch profile:', error);
    return NextResponse.json({ error: 'Internal server error', code: classified.code }, { status: classified.status });
  }
}
