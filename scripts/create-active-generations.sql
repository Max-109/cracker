-- Create active_generations table for background streaming support
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
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "active_gen_chat_idx" ON "active_generations" USING btree ("chat_id");
CREATE INDEX IF NOT EXISTS "active_gen_status_idx" ON "active_generations" USING btree ("status");

-- Drop old pending_generations table if it exists
DROP TABLE IF EXISTS "pending_generations";
