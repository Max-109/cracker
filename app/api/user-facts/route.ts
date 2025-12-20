import { getDb } from '@/db';
import { userFacts, userSettings } from '@/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { extractFacts, filterDuplicates, ExtractedFact } from '@/lib/profile-extractor';

const MAX_FACTS = 50;

// GET - Fetch user's facts
export async function GET() {
    try {
        const db = getDb();
        const user = await getAuthUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const facts = await db
            .select()
            .from(userFacts)
            .where(eq(userFacts.userId, user.id))
            .orderBy(desc(userFacts.createdAt));

        return NextResponse.json({ facts });
    } catch (error) {
        console.error('Failed to fetch user facts:', error);
        return NextResponse.json({ error: 'Failed to fetch facts' }, { status: 500 });
    }
}

// POST - Extract and add facts from a message
export async function POST(req: Request) {
    try {
        const db = getDb();
        const user = await getAuthUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message, messageId } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        // Check if memory is enabled for this user
        const [settings] = await db
            .select({ memoryEnabled: userSettings.memoryEnabled })
            .from(userSettings)
            .where(eq(userSettings.userId, user.id));

        if (settings && settings.memoryEnabled === false) {
            return NextResponse.json({ facts: [], added: 0 });
        }

        // Extract facts from message
        const extractedFacts = await extractFacts(message);

        if (extractedFacts.length === 0) {
            return NextResponse.json({ facts: [], added: 0 });
        }

        // Get existing facts for deduplication
        const existingFacts = await db
            .select({ fact: userFacts.fact })
            .from(userFacts)
            .where(eq(userFacts.userId, user.id));

        const existingFactStrings = existingFacts.map(f => f.fact);

        // Filter out duplicates
        const newFacts = filterDuplicates(extractedFacts, existingFactStrings);

        if (newFacts.length === 0) {
            return NextResponse.json({ facts: [], added: 0 });
        }

        // Check if we need to remove old facts to stay under limit
        const currentCount = existingFacts.length;
        const newCount = newFacts.length;
        const totalAfterAdd = currentCount + newCount;

        if (totalAfterAdd > MAX_FACTS) {
            // Remove oldest facts to make room (FIFO)
            const toRemove = totalAfterAdd - MAX_FACTS;
            const oldestFacts = await db
                .select({ id: userFacts.id })
                .from(userFacts)
                .where(eq(userFacts.userId, user.id))
                .orderBy(asc(userFacts.createdAt))
                .limit(toRemove);

            for (const old of oldestFacts) {
                await db.delete(userFacts).where(eq(userFacts.id, old.id));
            }
        }

        // Insert new facts
        const insertedFacts = await db
            .insert(userFacts)
            .values(
                newFacts.map(f => ({
                    userId: user.id,
                    fact: f.fact,
                    category: f.category,
                    sourceMessageId: messageId || null,
                }))
            )
            .returning();

        console.log(`[User Facts] Added ${insertedFacts.length} facts for user ${user.id}`);

        return NextResponse.json({
            facts: insertedFacts,
            added: insertedFacts.length
        });

    } catch (error) {
        console.error('Failed to extract/add facts:', error);
        return NextResponse.json({ error: 'Failed to process facts' }, { status: 500 });
    }
}

// DELETE - Remove a fact or clear all
export async function DELETE(req: Request) {
    try {
        const db = getDb();
        const user = await getAuthUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const factId = searchParams.get('id');
        const clearAll = searchParams.get('clearAll') === 'true';

        if (clearAll) {
            await db.delete(userFacts).where(eq(userFacts.userId, user.id));
            return NextResponse.json({ success: true, message: 'All facts cleared' });
        }

        if (factId) {
            await db
                .delete(userFacts)
                .where(eq(userFacts.id, factId));
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Fact ID or clearAll required' }, { status: 400 });

    } catch (error) {
        console.error('Failed to delete fact:', error);
        return NextResponse.json({ error: 'Failed to delete fact' }, { status: 500 });
    }
}

// PATCH - Update a fact
export async function PATCH(req: Request) {
    try {
        const db = getDb();
        const user = await getAuthUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, fact } = await req.json();

        if (!id || !fact) {
            return NextResponse.json({ error: 'ID and fact required' }, { status: 400 });
        }

        const [updated] = await db
            .update(userFacts)
            .set({ fact: fact.trim() })
            .where(eq(userFacts.id, id))
            .returning();

        return NextResponse.json({ success: true, fact: updated });

    } catch (error) {
        console.error('Failed to update fact:', error);
        return NextResponse.json({ error: 'Failed to update fact' }, { status: 500 });
    }
}
