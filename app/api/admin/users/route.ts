import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET - List all users (admin only)
export async function GET() {
  try {
    const db = getDb();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const [profile] = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, user.id));

    if (!profile?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all users
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Toggle admin status for user
export async function PATCH(request: NextRequest) {
  try {
    const db = getDb();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is admin
    const [profile] = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, user.id));

    if (!profile?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, isAdmin } = await request.json();

    if (!userId || typeof isAdmin !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Prevent self-demotion
    if (userId === user.id && !isAdmin) {
      return NextResponse.json({ error: 'Cannot remove your own admin status' }, { status: 400 });
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
