CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" jsonb NOT NULL,
	"model" text,
	"tokens_per_second" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"model_id" text NOT NULL,
	"reasoning_effort" text DEFAULT 'medium',
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"first_chunk_at" timestamp,
	"completed_at" timestamp,
	"response_content" jsonb,
	"tokens_per_second" text,
	"total_tokens" integer,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_generations" ADD CONSTRAINT "pending_generations_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "chats" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pending_gen_chat_idx" ON "pending_generations" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "pending_gen_status_idx" ON "pending_generations" USING btree ("status");