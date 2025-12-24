import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { classifyDbError } from '@/lib/db-errors';

// GET - Get user settings
export async function GET() {
  try {
    const db = getDb();
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get existing settings
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id));

    if (!settings) {
      // Create default settings for new user
      const [newSettings] = await db
        .insert(userSettings)
        .values({
          userId: user.id,
        })
        .returning();
      return NextResponse.json(newSettings);
    }

    return NextResponse.json(settings);
  } catch (error) {
    const classified = classifyDbError(error);
    if (classified.kind === 'quota_exceeded') {
      console.warn('Database quota exceeded while fetching settings.');
      return NextResponse.json({ error: classified.message, code: classified.code }, { status: classified.status });
    }
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Internal server error', code: classified.code }, { status: classified.status });
  }
}

// PUT - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const db = getDb();
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Extract only allowed fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // accentColor is now stored in the database for cross-device persistence
    const allowedFields = [
      'currentModelId',
      'currentModelName',
      'reasoningEffort',
      'responseLength',
      'learningMode',
      'chatMode',
      'learningSubMode',
      'customInstructions',
      'userName',
      'userGender',
      'enabledMcpServers',
      'accentColor', // Accent color for UI theming
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Upsert settings
    const [existing] = await db
      .select({ id: userSettings.id })
      .from(userSettings)
      .where(eq(userSettings.userId, user.id));

    let settings;
    if (existing) {
      [settings] = await db
        .update(userSettings)
        .set(updateData)
        .where(eq(userSettings.userId, user.id))
        .returning();
    } else {
      [settings] = await db
        .insert(userSettings)
        .values({
          userId: user.id,
          ...updateData,
        })
        .returning();
    }

    return NextResponse.json(settings);
  } catch (error) {
    const classified = classifyDbError(error);
    if (classified.kind === 'quota_exceeded') {
      console.warn('Database quota exceeded while updating settings.');
      return NextResponse.json({ error: classified.message, code: classified.code }, { status: classified.status });
    }
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Internal server error', code: classified.code }, { status: classified.status });
  }
}
