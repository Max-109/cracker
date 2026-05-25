import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { classifyDbError } from '@/lib/db-errors';
import {
  getCachedSettings,
  publishSettingsUpdated,
  requestMatchesSettings,
  serializeSettings,
  setCachedSettings,
  settingsHeaders,
  type SettingsPayload,
} from '@/lib/settings-cache';
import { validateSettingsUpdate } from '@/lib/settings-contract';

export const dynamic = 'force-dynamic';

async function loadSettingsFromDb(userId: string): Promise<SettingsPayload> {
  const db = getDb();

  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  if (settings) {
    return serializeSettings(settings, userId);
  }

  const [newSettings] = await db
    .insert(userSettings)
    .values({ userId })
    .returning();

  return serializeSettings(newSettings, userId);
}

// GET - Get user settings
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const cached = await getCachedSettings(user.id);
    if (cached) {
      if (requestMatchesSettings(request, cached)) {
        return new NextResponse(null, { status: 304, headers: settingsHeaders(cached, 'hit') });
      }
      return NextResponse.json(cached, { headers: settingsHeaders(cached, 'hit') });
    }

    const settings = await loadSettingsFromDb(user.id);
    await setCachedSettings(user.id, settings);

    if (requestMatchesSettings(request, settings)) {
      return new NextResponse(null, { status: 304, headers: settingsHeaders(settings, 'miss') });
    }

    return NextResponse.json(settings, { headers: settingsHeaders(settings, 'miss') });
  } catch (error) {
    const classified = classifyDbError(error);
    if (classified.kind === 'quota_exceeded') {
      console.warn('Database quota exceeded while fetching settings.');
      return NextResponse.json({ error: classified.message, code: classified.code }, { status: classified.status, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Internal server error', code: classified.code }, { status: classified.status, headers: { 'Cache-Control': 'no-store' } });
  }
}

// PUT - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const db = getDb();
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const body = await request.json();
    const parsed = validateSettingsUpdate(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: 'Invalid settings update', code: 'VALIDATION_ERROR', issues: parsed.issues }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      ...parsed.data,
    };
    const changedFields = parsed.changedFields;

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

    const payload = serializeSettings(settings, user.id);
    await setCachedSettings(user.id, payload);
    await publishSettingsUpdated(user.id, payload, changedFields);

    return NextResponse.json(payload, { headers: settingsHeaders(payload, 'write') });
  } catch (error) {
    const classified = classifyDbError(error);
    if (classified.kind === 'quota_exceeded') {
      console.warn('Database quota exceeded while updating settings.');
      return NextResponse.json({ error: classified.message, code: classified.code }, { status: classified.status, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Internal server error', code: classified.code }, { status: classified.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
