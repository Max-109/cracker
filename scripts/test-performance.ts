import { db } from '@/db';
import { chats, messages } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

async function testPerformance() {
  console.log('🚀 Running Performance Tests...\n');

  // Test 1: Cold cache - simulate first load
  console.log('🔍 Test 1: Cold Cache Performance');
  const startCold = performance.now();

  let allChats: any[] = [];

  try {
    // Simulate the old way (separate queries)
    const oldWayStart = performance.now();
    allChats = await db
      .select()
      .from(chats)
      .orderBy(desc(chats.createdAt))
      .limit(100);

    const chatIds = allChats.map(chat => chat.id);

    // Fetch messages for each chat (N+1 problem)
    const messagesPromises = chatIds.map(chatId =>
      db.select().from(messages).where(eq(messages.chatId, chatId))
    );

    const allMessages = await Promise.all(messagesPromises);
    const oldWayEnd = performance.now();

    // Fix TypeScript issue with flat()
    const totalMessages = allMessages.reduce((acc, messages) => acc + messages.length, 0);

    console.log(`⏱️  Old N+1 approach: ${(oldWayEnd - oldWayStart).toFixed(2)}ms`);
    console.log(`📊 Fetched ${allChats.length} chats with ${totalMessages} total messages`);

    // Test new optimized approach
    const newWayStart = performance.now();

    // Get all chats
    const optimizedChats = await db
      .select()
      .from(chats)
      .orderBy(desc(chats.createdAt))
      .limit(100);

    // Get all messages in single query
    const optimizedMessages = await db
      .select()
      .from(messages)
      .where(chatIds.length > 0 ? inArray(messages.chatId, chatIds) : eq(messages.chatId, ''));

    const newWayEnd = performance.now();

    console.log(`⏱️  New optimized approach: ${(newWayEnd - newWayStart).toFixed(2)}ms`);
    console.log(`📊 Fetched ${optimizedChats.length} chats with ${optimizedMessages.length} messages`);

    const improvement = ((oldWayEnd - oldWayStart) - (newWayEnd - newWayStart)) / (oldWayEnd - oldWayStart) * 100;
    console.log(`📈 Performance improvement: ${improvement.toFixed(1)}% faster\n`);

  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }

  // Test 2: Index performance
  console.log('🔍 Test 2: Index Performance');
  try {
    const testChatId = allChats.length > 0 ? allChats[0].id : '00000000-0000-0000-0000-000000000000';

    const indexTestStart = performance.now();
    const indexedMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, testChatId))
      .orderBy(desc(messages.createdAt));

    const indexTestEnd = performance.now();

    console.log(`⏱️  Indexed query: ${(indexTestEnd - indexTestStart).toFixed(2)}ms`);
    console.log(`📊 Retrieved ${indexedMessages.length} messages for chat ${testChatId}\n`);

  } catch (error) {
    console.error('❌ Index test failed:', error);
  }

  console.log('✅ Performance tests completed!');
}

// Fallback for Node.js performance API
declare const performance: {
  now: () => number;
};

testPerformance().catch(console.error);