CREATE TABLE "payout_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"stripe_account_id" text NOT NULL,
	"stripe_transfer_id" text,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teacher_profiles" ADD COLUMN "stripe_account_id" text;--> statement-breakpoint
ALTER TABLE "teacher_profiles" ADD COLUMN "stripe_ready" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payout_transfers" ADD CONSTRAINT "payout_transfers_batch_id_payout_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."payout_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_transfers" ADD CONSTRAINT "payout_transfers_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payout_transfers_batch_teacher_idx" ON "payout_transfers" USING btree ("batch_id","teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_provider_ref_idx" ON "orders" USING btree ("provider","provider_ref");