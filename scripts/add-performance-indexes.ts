import { getDb } from '@/db';
import { sql } from 'drizzle-orm';

async function addPerformanceIndexes() {
  try {
    const db = getDb();
    console.log('Adding performance indexes to database...');
    
    // Add indexes to messages table
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON messages(chat_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS messages_chat_id_created_at_idx ON messages(chat_id, created_at)
    `);
    
    console.log('✅ Performance indexes added successfully!');
    
    // Verify indexes exist
    const result = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'messages'
    `);
    
    console.log('Current indexes on messages table:');
    (result as any)?.rows?.forEach((row: any) => {
      console.log(`- ${row.indexname}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to add performance indexes:', error);
    process.exit(1);
  }
}

addPerformanceIndexes();
