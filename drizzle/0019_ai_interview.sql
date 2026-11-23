ALTER TABLE "ai_conversations" ADD COLUMN "mode" text DEFAULT 'chat' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD COLUMN "valid_answers" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD COLUMN "info_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD COLUMN "feedback" jsonb;