CREATE TABLE IF NOT EXISTS "payment_provider_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_checkout_enabled" boolean DEFAULT true NOT NULL,
	"stripe_payout_enabled" boolean DEFAULT true NOT NULL,
	"manual_payout_enabled" boolean DEFAULT true NOT NULL,
	"updated_by_user_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_provider_settings" ADD CONSTRAINT "payment_provider_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "payment_provider_settings" ("id") VALUES ('default') ON CONFLICT ("id") DO NOTHING;