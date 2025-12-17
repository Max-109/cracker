import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { getDatabaseUrl } from '../db/env';
dotenv.config();

const sql = postgres(getDatabaseUrl());

async function migrate() {
  console.log('Creating active_generations table...');
  
  try {
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS "active_generations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "chat_id" uuid NOT NULL REFERENCES "chats"("id"),
        "model_id" text NOT NULL,
        "reasoning_effort" text DEFAULT 'medium',
        "status" text DEFAULT 'streaming' NOT NULL,
        "started_at" timestamp DEFAULT now() NOT NULL,
        "first_chunk_at" timestamp,
        "completed_at" timestamp,
        "last_update_at" timestamp DEFAULT now() NOT NULL,
        "partial_text" text DEFAULT '',
        "partial_reasoning" text DEFAULT '',
        "response_content" jsonb,
        "tokens_per_second" text,
        "total_tokens" integer,
        "error" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log('Table created!');
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS "active_gen_chat_idx" ON "active_generations" USING btree ("chat_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "active_gen_status_idx" ON "active_generations" USING btree ("status")`;
    console.log('Indexes created!');
    
    // Drop old table
    await sql`DROP TABLE IF EXISTS "pending_generations"`;
    console.log('Old table dropped!');
    
    console.log('Migration complete!');
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    await sql.end();
  }
}

migrate();
