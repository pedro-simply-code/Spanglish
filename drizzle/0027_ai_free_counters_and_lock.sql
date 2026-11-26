ALTER TABLE "ai_conversations" ADD COLUMN "busy_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ai_credit_accounts" ADD COLUMN "free_used_voice" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_credit_accounts" ADD COLUMN "free_used_chat" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Carry over the free conversations already used (they were counted from ai_conversations).
INSERT INTO "ai_credit_accounts" ("user_id", "balance", "free_used_voice", "free_used_chat", "updated_at")
SELECT "user_id", 0,
       count(*) FILTER (WHERE "mode" = 'voice'),
       count(*) FILTER (WHERE "mode" = 'chat'),
       now()
FROM "ai_conversations"
WHERE "billing" = 'free'
GROUP BY "user_id"
ON CONFLICT ("user_id") DO UPDATE
SET "free_used_voice" = EXCLUDED."free_used_voice",
    "free_used_chat" = EXCLUDED."free_used_chat";
