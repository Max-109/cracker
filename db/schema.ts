import { pgTable, text, timestamp, uuid, jsonb, index, integer } from 'drizzle-orm/pg-core';

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('created_at_idx').on(table.createdAt),
]);

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  role: text('role').notNull(),
  content: jsonb('content').notNull(),
  model: text('model'),
  tokensPerSecond: text('tokens_per_second'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Active generations - tracks streaming progress for background/resume support
export const activeGenerations = pgTable('active_generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  modelId: text('model_id').notNull(),
  reasoningEffort: text('reasoning_effort').default('medium'),
  status: text('status').default('streaming').notNull(), // streaming, completed, failed
  // Timing tracked server-side
  startedAt: timestamp('started_at').defaultNow().notNull(),
  firstChunkAt: timestamp('first_chunk_at'),
  completedAt: timestamp('completed_at'),
  lastUpdateAt: timestamp('last_update_at').defaultNow().notNull(),
  // Partial content (updated during streaming)
  partialText: text('partial_text').default(''),
  partialReasoning: text('partial_reasoning').default(''),
  // Final results
  responseContent: jsonb('response_content'),
  tokensPerSecond: text('tokens_per_second'),
  totalTokens: integer('total_tokens'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('active_gen_chat_idx').on(table.chatId),
  index('active_gen_status_idx').on(table.status),
]);
