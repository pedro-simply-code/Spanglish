-- Columns that were added to the schema with `drizzle-kit push` but had no
-- migration (a fresh `pnpm db:migrate` missed them). Idempotent: safe on a
-- database that already has them.
ALTER TABLE "class_sessions" ADD COLUMN IF NOT EXISTS "billing_kind" text DEFAULT 'standard' NOT NULL;
--> statement-breakpoint
ALTER TABLE "class_sessions" ADD COLUMN IF NOT EXISTS "credit_value_cents" integer;
--> statement-breakpoint
ALTER TABLE "credit_accounts" ADD COLUMN IF NOT EXISTS "avg_credit_value_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "payout_batches" ADD COLUMN IF NOT EXISTS "initiated_by" text DEFAULT 'manager' NOT NULL;
--> statement-breakpoint
ALTER TABLE "payout_settings" ADD COLUMN IF NOT EXISTS "platform_take_level_1" integer DEFAULT 25 NOT NULL;
--> statement-breakpoint
ALTER TABLE "payout_settings" ADD COLUMN IF NOT EXISTS "platform_take_level_2" integer DEFAULT 20 NOT NULL;
--> statement-breakpoint
ALTER TABLE "payout_settings" ADD COLUMN IF NOT EXISTS "platform_take_level_3" integer DEFAULT 15 NOT NULL;
--> statement-breakpoint
ALTER TABLE "payout_settings" ADD COLUMN IF NOT EXISTS "platform_take_level_4" integer DEFAULT 10 NOT NULL;
--> statement-breakpoint
ALTER TABLE "payout_settings" ADD COLUMN IF NOT EXISTS "trial_percent" integer DEFAULT 50 NOT NULL;
--> statement-breakpoint
ALTER TABLE "payout_settings" ADD COLUMN IF NOT EXISTS "trial_reference_25_cents" integer DEFAULT 1600 NOT NULL;
--> statement-breakpoint
ALTER TABLE "payout_settings" ADD COLUMN IF NOT EXISTS "trial_reference_50_cents" integer DEFAULT 2300 NOT NULL;
--> statement-breakpoint
ALTER TABLE "payout_settings" ALTER COLUMN "rate_25_cents" SET DEFAULT 800;
--> statement-breakpoint
ALTER TABLE "payout_settings" ALTER COLUMN "rate_50_cents" SET DEFAULT 1400;
--> statement-breakpoint
ALTER TABLE "payout_settings" ALTER COLUMN "paired_percent" SET DEFAULT 140;
