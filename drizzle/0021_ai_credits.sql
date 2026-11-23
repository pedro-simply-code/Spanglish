CREATE TABLE "ai_credit_accounts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_credit_accounts_balance_non_negative" CHECK ("ai_credit_accounts"."balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ai_credit_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"buyer_user_id" text NOT NULL,
	"pack_id" text,
	"credits" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text,
	"status" text DEFAULT 'paid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_credit_packs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"credits" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_credit_packs_credits_positive" CHECK ("ai_credit_packs"."credits" > 0),
	CONSTRAINT "ai_credit_packs_price_positive" CHECK ("ai_credit_packs"."price_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "ai_credit_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"order_id" text,
	"conversation_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD COLUMN "billing" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_credit_accounts" ADD CONSTRAINT "ai_credit_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_orders" ADD CONSTRAINT "ai_credit_orders_buyer_user_id_users_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_transactions" ADD CONSTRAINT "ai_credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_credit_orders_buyer_idx" ON "ai_credit_orders" USING btree ("buyer_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_credit_orders_provider_ref_idx" ON "ai_credit_orders" USING btree ("provider","provider_ref");--> statement-breakpoint
CREATE INDEX "ai_credit_transactions_user_idx" ON "ai_credit_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
INSERT INTO "ai_credit_packs" ("id", "name", "credits", "price_cents", "active", "sort_order") VALUES
	('ai-10', 'AI starter', 10, 500, true, 1),
	('ai-25', 'AI practice', 25, 1000, true, 2),
	('ai-50', 'AI fluency', 50, 1800, true, 3)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "pricing_packages" ("id", "class_type", "duration_minutes", "credits", "name", "label", "description", "price_per_class_cents", "total_cents", "savings_percent", "active", "sort_order", "published_at") VALUES
	('individual-25-1', 'one-on-one', 25, 1, 'Single class', 'Single', 'One class when you need it, no commitment.', 1800, 1800, 0, true, 1000, now()),
	('individual-50-1', 'one-on-one', 50, 1, 'Single class', 'Single', 'One class when you need it, no commitment.', 2600, 2600, 0, true, 1001, now()),
	('paired-25-1', 'paired', 25, 1, 'Single paired class', 'Single', 'One class when you need it, no commitment.', 2700, 2700, 0, true, 1002, now()),
	('paired-50-1', 'paired', 50, 1, 'Single paired class', 'Single', 'One class when you need it, no commitment.', 3800, 3800, 0, true, 1003, now())
ON CONFLICT DO NOTHING;
