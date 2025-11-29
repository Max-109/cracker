import { pgTable, text, timestamp, uuid, jsonb, index, integer, boolean } from 'drizzle-orm/pg-core';

// Users table - links to Supabase Auth
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Same as Supabase Auth user ID
  email: text('email').notNull().unique(),
  name: text('name'),
  isAdmin: boolean('is_admin').default(false).notNull(),
  invitationCodeId: uuid('invitation_code_id'), // Reference to invitation_codes.id
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('users_email_idx').on(table.email),
]);

// Invitation codes table
export const invitationCodes = pgTable('invitation_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // UUID without dashes (32 chars)
  createdBy: uuid('created_by'), // Reference to users.id (admin who created)
  usedBy: uuid('used_by'), // Reference to users.id (user who used)
  usedAt: timestamp('used_at'),
  disabled: boolean('disabled').default(false).notNull(), // Admin can disable codes
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('invitation_codes_code_idx').on(table.code),
]);

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // Owner of the chat
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('created_at_idx').on(table.createdAt),
  index('chats_user_id_idx').on(table.userId),
]);

// User settings - per-user preferences
export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(), // One settings record per user
  // Model settings
  currentModelId: text('current_model_id').default('google/gemini-3-pro-preview'),
  currentModelName: text('current_model_name').default('Expert'),
  reasoningEffort: text('reasoning_effort').default('medium'),
  // Response settings
  responseLength: integer('response_length').default(50),
  learningMode: boolean('learning_mode').default(false),
  // Profile settings
  userName: text('user_name'),
  userGender: text('user_gender').default('not-specified'),
  // Appearance
  accentColor: text('accent_color').default('#af8787'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('user_settings_user_id_idx').on(table.userId),
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
