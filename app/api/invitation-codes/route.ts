import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDb } from '@/db';
import { users, invitationCodes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Generate invitation code (UUID without dashes)
function generateCode(): string {
  return randomUUID().replace(/-/g, '');
}

// GET - List all invitation codes (admin only)
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

    // Fetch all invitation codes with creator and user info
    const codes = await db
      .select({
        id: invitationCodes.id,
        code: invitationCodes.code,
        createdAt: invitationCodes.createdAt,
        usedAt: invitationCodes.usedAt,
        createdBy: invitationCodes.createdBy,
        usedBy: invitationCodes.usedBy,
        disabled: invitationCodes.disabled,
      })
      .from(invitationCodes)
      .orderBy(desc(invitationCodes.createdAt));

    // Get user details for codes
    const codesWithDetails = await Promise.all(
      codes.map(async (code) => {
        let creatorName = null;
        let usedByName = null;
        let usedByEmail = null;

        if (code.createdBy) {
          const [creator] = await db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, code.createdBy));
          creatorName = creator?.name || creator?.email;
        }

        if (code.usedBy) {
          const [usedByUser] = await db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, code.usedBy));
          usedByName = usedByUser?.name;
          usedByEmail = usedByUser?.email;
        }

        return {
          ...code,
          creatorName,
          usedByName,
          usedByEmail,
        };
      })
    );

    return NextResponse.json(codesWithDetails);
  } catch (error) {
    console.error('Failed to fetch invitation codes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Toggle disabled status for invitation code
export async function PATCH(request: NextRequest) {
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

    const { id, disabled } = await request.json();

    if (!id || typeof disabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Update code
    const [updatedCode] = await db
      .update(invitationCodes)
      .set({ disabled })
      .where(eq(invitationCodes.id, id))
      .returning();

    return NextResponse.json(updatedCode);
  } catch (error) {
    console.error('Failed to update invitation code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new invitation code (admin only)
export async function POST() {
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

    // Generate and insert new code
    const code = generateCode();
    const [newCode] = await db
      .insert(invitationCodes)
      .values({
        code,
        createdBy: user.id,
      })
      .returning();

    return NextResponse.json(newCode);
  } catch (error) {
    console.error('Failed to create invitation code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
