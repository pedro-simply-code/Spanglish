CREATE TABLE "ai_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"scenario" text NOT NULL,
	"topic" text DEFAULT '' NOT NULL,
	"language" text NOT NULL,
	"level" text NOT NULL,
	"title" text NOT NULL,
	"scene_svg" text,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_micros" integer DEFAULT 0 NOT NULL,
	"token_limit" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_conversations_user_idx" ON "ai_conversations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_idx" ON "ai_messages" USING btree ("conversation_id","created_at");