
import { getDb } from '../db';
import { messages, chats } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

async function verifyMessages() {
  const db = getDb();
  console.log("--- Verifying AI Responses in DB ---");

  // Get the last 5 chats
  const recentChats = await db.select().from(chats).orderBy(desc(chats.createdAt)).limit(5);

  if (recentChats.length === 0) {
    console.log("No chats found.");
    process.exit(0);
  }

  for (const chat of recentChats) {
    console.log(`\nChat: ${chat.title} (${chat.id})`);
    const msgs = await db.select().from(messages).where(eq(messages.chatId, chat.id));
    
    if (msgs.length === 0) {
      console.log("  No messages found.");
      continue;
    }

    msgs.forEach((m, i) => {
        let contentPreview = "";
        if (typeof m.content === 'string') {
            contentPreview = m.content.substring(0, 50);
        } else {
            contentPreview = JSON.stringify(m.content).substring(0, 50);
        }
        
        console.log(`  [${i}] ${m.role}: ${contentPreview.length > 0 ? contentPreview : "[EMPTY CONTENT]"}`);
        
        if (m.role === 'assistant' && (!m.content || m.content === " " || m.content === "")) {
            console.log("      ⚠️  WARNING: Empty or whitespace-only assistant message detected!");
        }
    });
  }
  process.exit(0);
}

verifyMessages();
