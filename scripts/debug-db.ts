
import { getDb } from '../db';
import { messages, chats } from '../db/schema';
import { eq } from 'drizzle-orm';

async function debugChatHistory() {
  const db = getDb();
  console.log("--- Debugging Chat History ---");

  // 1. Get the most recent chat
  const recentChats = await db.select().from(chats).limit(1);
  
  if (recentChats.length === 0) {
    console.log("No chats found.");
    process.exit(0);
  }

  const chatId = recentChats[0].id;
  console.log(`Checking messages for chat: ${chatId} (${recentChats[0].title})`);

  // 2. Get messages for this chat
  const chatMessages = await db.select().from(messages).where(eq(messages.chatId, chatId));
  
  console.log(`Found ${chatMessages.length} messages.`);
  
  chatMessages.forEach((msg, i) => {
    console.log(`\n[${i}] Role: ${msg.role}`);
    console.log(`    Content Type: ${typeof msg.content}`);
    console.log(`    Content: ${JSON.stringify(msg.content).substring(0, 100)}...`);
  });

  process.exit(0);
}

debugChatHistory();
