import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { users, invitationCodes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getAuthUser } from '@/lib/auth';

function generateCode(): string {
  return randomUUID().replace(/-/g, '');
}

async function requireAdmin() {
  const authUser = await getAuthUser();
  if (!authUser) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const db = getDb();
  const [profile] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, authUser.id));

  if (!profile?.isAdmin) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }

  return { authUser, db };
}

// GET - List all invitation codes (admin only)
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const codes = await auth.db
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

    const codesWithDetails = await Promise.all(
      codes.map(async (code) => {
        let creatorName = null;
        let usedByName = null;
        let usedByEmail = null;

        if (code.createdBy) {
          const [creator] = await auth.db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, code.createdBy));
          creatorName = creator?.name || creator?.email;
        }

        if (code.usedBy) {
          const [usedByUser] = await auth.db
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
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { id, disabled } = await request.json();

    if (!id || typeof disabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const [updatedCode] = await auth.db
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
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const code = generateCode();
    const [newCode] = await auth.db
      .insert(invitationCodes)
      .values({
        code,
        createdBy: auth.authUser.id,
      })
      .returning();

    return NextResponse.json(newCode);
  } catch (error) {
    console.error('Failed to create invitation code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
