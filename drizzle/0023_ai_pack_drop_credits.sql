ALTER TABLE "ai_credit_packs" DROP CONSTRAINT "ai_credit_packs_credits_positive";--> statement-breakpoint
ALTER TABLE "ai_credit_packs" DROP COLUMN "credits";--> statement-breakpoint
-- Example packs: price and margin (25% on the smallest down to 10% on the biggest).
DELETE FROM "ai_credit_packs" WHERE "id" IN ('ai-10', 'ai-25', 'ai-50');--> statement-breakpoint
INSERT INTO "ai_credit_packs" ("id", "name", "price_cents", "margin_percent", "active", "sort_order") VALUES
	('ai-1', 'AI try', 100, 25, true, 1),
	('ai-3', 'AI starter', 300, 20, true, 2),
	('ai-5', 'AI practice', 500, 15, true, 3),
	('ai-10', 'AI fluency', 1000, 10, true, 4)
ON CONFLICT ("id") DO NOTHING;
