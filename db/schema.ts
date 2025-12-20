import { pgTable, text, timestamp, uuid, jsonb, index, integer, boolean } from 'drizzle-orm/pg-core';

// Users table - links to Supabase Auth
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Same as Supabase Auth user ID
  email: text('email').notNull().unique(),
  name: text('name'),
  isAdmin: boolean('is_admin').default(false).notNull(),
  isGuest: boolean('is_guest').default(false).notNull(), // Guest mode users
  guestLogin: text('guest_login'), // Login name for guest users (unique for guests)
  invitationCodeId: uuid('invitation_code_id'), // Reference to invitation_codes.id
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('users_email_idx').on(table.email),
  index('users_guest_login_idx').on(table.guestLogin),
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
  mode: text('mode').default('chat'), // 'chat' | 'learning' | 'deep-search'
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('created_at_idx').on(table.createdAt),
  index('chats_user_id_idx').on(table.userId),
]);

// Per-chat encryption keys (DEKs wrapped by KEK)
export const chatKeys = pgTable('chat_keys', {
  chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'cascade' }).primaryKey(),
  encryptedDek: text('encrypted_dek').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


// User settings - per-user preferences
export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(), // One settings record per user
  // Model settings
  currentModelId: text('current_model_id').default('gemini-3-pro-preview'),
  currentModelName: text('current_model_name').default('Expert'),
  reasoningEffort: text('reasoning_effort').default('medium'),
  // Response settings
  responseLength: integer('response_length').default(30),
  learningMode: boolean('learning_mode').default(false), // Deprecated: use chatMode
  chatMode: text('chat_mode').default('chat'), // 'chat' | 'learning' | 'deep-search'
  learningSubMode: text('learning_sub_mode').default('teaching'), // 'summary' | 'flashcard' | 'teaching'
  customInstructions: text('custom_instructions'), // User's custom instructions (highest priority)
  // MCP settings - which servers are enabled for this user
  enabledMcpServers: jsonb('enabled_mcp_servers').default(['brave-search']), // Array of MCP server slugs
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
  learningSubMode: text('learning_sub_mode'), // Store the mode used for this message
  tokensPerSecond: text('tokens_per_second'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('messages_chat_id_idx').on(table.chatId),
  index('messages_created_at_idx').on(table.createdAt),
  index('messages_chat_id_created_at_idx').on(table.chatId, table.createdAt),
]);

// MCP Server registry - built-in and custom MCP servers
export const mcpServers = pgTable('mcp_servers', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(), // e.g., "brave-search"
  name: text('name').notNull(), // e.g., "Brave Search"
  description: text('description'), // User-facing description
  serverUrl: text('server_url'), // HTTP endpoint for remote MCP server (optional)
  apiKeyEnvVar: text('api_key_env_var'), // e.g., "BRAVE_API_KEY" - which env var holds the key
  isBuiltIn: boolean('is_built_in').default(true).notNull(), // System-provided vs user-added
  enabled: boolean('enabled').default(true).notNull(), // Globally enabled/disabled
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('mcp_servers_slug_idx').on(table.slug),
]);

// Active generations - tracks streaming responses for reconnection
export const activeGenerations = pgTable('active_generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  modelId: text('model_id').notNull(),
  reasoningEffort: text('reasoning_effort').default('medium'),
  status: text('status').default('streaming').notNull(), // 'streaming' | 'completed' | 'error'
  startedAt: timestamp('started_at').defaultNow().notNull(),
  firstChunkAt: timestamp('first_chunk_at'),
  completedAt: timestamp('completed_at'),
  lastUpdateAt: timestamp('last_update_at').defaultNow().notNull(),
  partialText: text('partial_text').default(''),
  partialReasoning: text('partial_reasoning').default(''),
  responseContent: jsonb('response_content'),
  tokensPerSecond: text('tokens_per_second'),
  totalTokens: integer('total_tokens'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('active_gen_chat_idx').on(table.chatId),
  index('active_gen_status_idx').on(table.status),
]);
