import { chats, userFacts, userSettings } from '@/db/schema';
import { extractFacts, filterDuplicates } from '@/lib/profile-extractor';
import { asc, desc, eq } from 'drizzle-orm';

export async function loadChatMemory(db: any, chatId?: string) {
  let userMemoryFacts: string[] = [];
  let memoryEnabled = true;
  let userId: string | null = null;

  if (!chatId) return { userMemoryFacts, memoryEnabled, userId };

  try {
    const [chat] = await db.select({ userId: chats.userId })
      .from(chats)
      .where(eq(chats.id, chatId))
      .limit(1);

    if (!chat?.userId) return { userMemoryFacts, memoryEnabled, userId };

    const foundUserId = chat.userId;
    userId = foundUserId;

    const [settings] = await db.select({ memoryEnabled: userSettings.memoryEnabled })
      .from(userSettings)
      .where(eq(userSettings.userId, foundUserId))
      .limit(1);

    memoryEnabled = settings?.memoryEnabled !== false;

    if (memoryEnabled) {
      const facts = await db.select({ fact: userFacts.fact })
        .from(userFacts)
        .where(eq(userFacts.userId, foundUserId))
        .orderBy(desc(userFacts.createdAt))
        .limit(50);

      userMemoryFacts = facts.map((f: { fact: string }) => f.fact);
    }
  } catch (chatLookupError) {
    console.log('[API] Chat lookup failed (continuing without user context):', chatId, chatLookupError);
  }

  return { userMemoryFacts, memoryEnabled, userId };
}

export function extractAndStoreFactsInBackground(db: any, userId: string | null, memoryEnabled: boolean, messageText: string) {
  if (!memoryEnabled || !userId || messageText.length === 0) return;
  const stableUserId = userId;

  void (async () => {
    try {
      const newFacts = await extractFacts(messageText);
      if (newFacts.length === 0) return;

      const existingFacts = await db.select({ fact: userFacts.fact })
        .from(userFacts)
        .where(eq(userFacts.userId, stableUserId));

      const existingFactStrings = existingFacts.map((f: { fact: string }) => f.fact);
      const uniqueFacts = filterDuplicates(newFacts, existingFactStrings);
      if (uniqueFacts.length === 0) return;

      const totalAfterAdd = existingFacts.length + uniqueFacts.length;
      if (totalAfterAdd > 50) {
        const oldestFacts = await db.select({ id: userFacts.id })
          .from(userFacts)
          .where(eq(userFacts.userId, stableUserId))
          .orderBy(asc(userFacts.createdAt))
          .limit(totalAfterAdd - 50);

        for (const old of oldestFacts) {
          await db.delete(userFacts).where(eq(userFacts.id, old.id));
        }
      }

      await db.insert(userFacts).values(uniqueFacts.map((f) => ({
        userId: stableUserId,
        fact: f.fact,
        category: f.category,
      })));

      console.log(`[Memory] +${uniqueFacts.length} facts`);
    } catch (err) {
      console.error('[Memory] Error:', err);
    }
  })();
}
