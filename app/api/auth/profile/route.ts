import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isAdmin: users.isAdmin,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
