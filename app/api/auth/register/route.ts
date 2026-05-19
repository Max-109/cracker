import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { users, invitationCodes, userSettings } from '@/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const { email, password, name, invitationCode } = await request.json();

    if (!email || !password || !invitationCode) {
      return NextResponse.json(
        { error: 'Email, password, and invitation code are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (String(password).length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existingUser) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 400 });
    }

    // Validate invitation code (case-insensitive, lowercase stored)
    const normalizedCode = String(invitationCode).toLowerCase().trim();
    const [code] = await db
      .select()
      .from(invitationCodes)
      .where(
        and(
          eq(invitationCodes.code, normalizedCode),
          isNull(invitationCodes.usedBy)
        )
      );

    if (!code) {
      return NextResponse.json(
        { error: 'Invalid or already used invitation code' },
        { status: 400 }
      );
    }

    if (code.disabled) {
      return NextResponse.json(
        { error: 'This invitation code has been disabled' },
        { status: 400 }
      );
    }

    const userId = randomUUID();

    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      passwordHash: hashPassword(String(password)),
      name: name ? String(name) : null,
      isAdmin: false,
      invitationCodeId: code.id,
    });

    await db.insert(userSettings).values({ userId }).onConflictDoNothing();

    await db
      .update(invitationCodes)
      .set({
        usedBy: userId,
        usedAt: new Date(),
      })
      .where(eq(invitationCodes.id, code.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
