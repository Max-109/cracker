
import { getDb } from '../db';
import { messages, chats } from '../db/schema';

async function clearDatabase() {
  const db = getDb();
  console.log("--- Clearing Database ---");

  try {
    // Delete messages first due to foreign key constraints
    console.log("Deleting all messages...");
    await db.delete(messages);
    console.log("Messages deleted.");

    // Delete chats
    console.log("Deleting all chats...");
    await db.delete(chats);
    console.log("Chats deleted.");

    console.log("--- Database Cleared Successfully ---");
  } catch (error) {
    console.error("Error clearing database:", error);
  }
  process.exit(0);
}

clearDatabase();
