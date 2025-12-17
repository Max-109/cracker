import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { getDatabaseUrl } from '../db/env';
dotenv.config();

const sql = postgres(getDatabaseUrl());

async function cleanup() {
  console.log('Cleaning up stale active_generations records...');
  
  try {
    // Get stale records (older than 30 seconds)
    const staleRecords = await sql`
      SELECT * FROM active_generations 
      WHERE status = 'streaming' 
      AND last_update_at < NOW() - INTERVAL '30 seconds'
    `;
    
    console.log(`Found ${staleRecords.length} stale records`);
    
    for (const record of staleRecords) {
      console.log(`Processing stale record: ${record.id}`);
      
      // Save partial content as message if any
      if (record.partial_text || record.partial_reasoning) {
        const contentParts = [];
        if (record.partial_reasoning) {
          contentParts.push({ type: 'reasoning', text: record.partial_reasoning, reasoning: record.partial_reasoning });
        }
        if (record.partial_text) {
          contentParts.push({ type: 'text', text: record.partial_text });
        }
        
        await sql`
          INSERT INTO messages (chat_id, role, content, model)
          VALUES (${record.chat_id}, 'assistant', ${JSON.stringify(contentParts)}, ${record.model_id})
        `;
        console.log(`Saved partial content for record ${record.id}`);
      }
      
      // Delete the stale record
      await sql`DELETE FROM active_generations WHERE id = ${record.id}`;
      console.log(`Deleted stale record ${record.id}`);
    }
    
    console.log('Cleanup complete!');
  } catch (e) {
    console.error('Cleanup failed:', e);
  } finally {
    await sql.end();
  }
}

cleanup();
