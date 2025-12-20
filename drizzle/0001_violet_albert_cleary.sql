CREATE TABLE "active_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "chat_keys" (
	"chat_id" uuid PRIMARY KEY NOT NULL,
	"encrypted_dek" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"created_by" uuid,
	"used_by" uuid,
	"used_at" timestamp,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"server_url" text,
	"api_key_env_var" text,
	"is_built_in" boolean DEFAULT true NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_servers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_model_id" text DEFAULT 'gemini-3-pro-preview',
	"current_model_name" text DEFAULT 'Expert',
	"reasoning_effort" text DEFAULT 'medium',
	"response_length" integer DEFAULT 30,
	"learning_mode" boolean DEFAULT false,
	"chat_mode" text DEFAULT 'chat',
	"learning_sub_mode" text DEFAULT 'teaching',
	"custom_instructions" text,
	"enabled_mcp_servers" jsonb DEFAULT '["brave-search"]'::jsonb,
	"user_name" text,
	"user_gender" text DEFAULT 'not-specified',
	"accent_color" text DEFAULT '#af8787',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_guest" boolean DEFAULT false NOT NULL,
	"guest_login" text,
	"invitation_code_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "pending_generations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "pending_generations" CASCADE;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "mode" text DEFAULT 'chat';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "learning_sub_mode" text;--> statement-breakpoint
ALTER TABLE "active_generations" ADD CONSTRAINT "active_generations_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_keys" ADD CONSTRAINT "chat_keys_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "active_gen_chat_idx" ON "active_generations" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "active_gen_status_idx" ON "active_generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invitation_codes_code_idx" ON "invitation_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "mcp_servers_slug_idx" ON "mcp_servers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "user_settings_user_id_idx" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_guest_login_idx" ON "users" USING btree ("guest_login");--> statement-breakpoint
CREATE INDEX "chats_user_id_idx" ON "chats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_chat_id_idx" ON "messages" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "messages_chat_id_created_at_idx" ON "messages" USING btree ("chat_id","created_at");