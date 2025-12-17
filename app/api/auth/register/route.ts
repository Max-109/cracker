import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getDb } from '@/db';
import { users, invitationCodes } from '@/db/schema';
import { eq, isNull, and } from 'drizzle-orm';

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

    // Validate invitation code (case-insensitive, lowercase stored)
    const normalizedCode = invitationCode.toLowerCase().trim();
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

    // Check if code is disabled
    if (code.disabled) {
      return NextResponse.json(
        { error: 'This invitation code has been disabled' },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth
    const supabase = await createAdminClient();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create user profile in our database
    await db.insert(users).values({
      id: authData.user.id,
      email: authData.user.email!,
      name: name || null,
      isAdmin: false,
      invitationCodeId: code.id,
    });

    // Mark invitation code as used
    await db
      .update(invitationCodes)
      .set({
        usedBy: authData.user.id,
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
