CREATE TABLE "class_change_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"new_starts_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"responded_by_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "class_participants" (
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"first_joined_at" timestamp with time zone,
	"last_joined_at" timestamp with time zone,
	"last_left_at" timestamp with time zone,
	"seconds_present" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "class_participants_session_id_user_id_pk" PRIMARY KEY("session_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "class_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"teacher_id" text NOT NULL,
	"class_type" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"pair_id" text,
	"booked_by_user_id" text,
	"credit_account_id" text,
	"topic" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"agenda" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outcomes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"materials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"material_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assignment_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recap" text,
	"teacher_note" text,
	"homework" text,
	"cancellation" jsonb,
	"rescheduled_from" timestamp with time zone,
	"live_started_at" timestamp with time zone,
	"live_started_by_user_id" text,
	"live_ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_sessions_time_order" CHECK ("class_sessions"."starts_at" < "class_sessions"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "classroom_waiting" (
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classroom_waiting_session_id_user_id_pk" PRIMARY KEY("session_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "credit_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"holder" text NOT NULL,
	"class_type" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_accounts_balance_non_negative" CHECK ("credit_accounts"."balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"session_id" text,
	"order_id" text,
	"actor_user_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"buyer_user_id" text NOT NULL,
	"pair_id" text,
	"package_id" text,
	"class_type" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"credits" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text,
	"status" text DEFAULT 'paid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"class_type" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"credits" integer NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"price_per_class_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"savings_percent" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"source" text NOT NULL,
	"storage" text NOT NULL,
	"object_key" text,
	"file_name" text,
	"content_type" text,
	"size_bytes" bigint,
	"status" text NOT NULL,
	"egress_id" text,
	"egress_kind" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "student_pairs" (
	"id" text PRIMARY KEY NOT NULL,
	"student_a_id" text NOT NULL,
	"student_b_id" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "student_pairs_distinct" CHECK ("student_pairs"."student_a_id" <> "student_pairs"."student_b_id")
);
--> statement-breakpoint
CREATE TABLE "teacher_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"teacher_id" text NOT NULL,
	"weekday" smallint NOT NULL,
	"start_minute" smallint NOT NULL,
	"end_minute" smallint NOT NULL,
	CONSTRAINT "teacher_availability_range" CHECK ("teacher_availability"."weekday" BETWEEN 0 AND 6 AND "teacher_availability"."start_minute" >= 0 AND "teacher_availability"."end_minute" <= 1440 AND "teacher_availability"."start_minute" < "teacher_availability"."end_minute")
);
--> statement-breakpoint
CREATE TABLE "teacher_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bookable" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "classroom_chat_messages" DROP CONSTRAINT IF EXISTS "classroom_chat_messages_class_id_live_classes_id_fk";--> statement-breakpoint
-- Chat history pointed at the old demo classes; it cannot follow them.
DELETE FROM "classroom_chat_messages";--> statement-breakpoint
DROP TABLE IF EXISTS "live_classes" CASCADE;
--> statement-breakpoint
ALTER TABLE "class_change_requests" ADD CONSTRAINT "class_change_requests_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_change_requests" ADD CONSTRAINT "class_change_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_change_requests" ADD CONSTRAINT "class_change_requests_responded_by_user_id_users_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_participants" ADD CONSTRAINT "class_participants_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_participants" ADD CONSTRAINT "class_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_pair_id_student_pairs_id_fk" FOREIGN KEY ("pair_id") REFERENCES "public"."student_pairs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_booked_by_user_id_users_id_fk" FOREIGN KEY ("booked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_credit_account_id_credit_accounts_id_fk" FOREIGN KEY ("credit_account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_waiting" ADD CONSTRAINT "classroom_waiting_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_waiting" ADD CONSTRAINT "classroom_waiting_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_user_id_users_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_pair_id_student_pairs_id_fk" FOREIGN KEY ("pair_id") REFERENCES "public"."student_pairs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_pairs" ADD CONSTRAINT "student_pairs_student_a_id_users_id_fk" FOREIGN KEY ("student_a_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_pairs" ADD CONSTRAINT "student_pairs_student_b_id_users_id_fk" FOREIGN KEY ("student_b_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_pairs" ADD CONSTRAINT "student_pairs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_availability" ADD CONSTRAINT "teacher_availability_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "class_change_requests_one_pending_idx" ON "class_change_requests" USING btree ("session_id") WHERE "class_change_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "class_participants_user_idx" ON "class_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "class_sessions_teacher_start_idx" ON "class_sessions" USING btree ("teacher_id","starts_at");--> statement-breakpoint
CREATE INDEX "class_sessions_start_idx" ON "class_sessions" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_accounts_holder_kind_idx" ON "credit_accounts" USING btree ("holder","class_type","duration_minutes");--> statement-breakpoint
CREATE INDEX "credit_transactions_account_idx" ON "credit_transactions" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_buyer_idx" ON "orders" USING btree ("buyer_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pricing_packages_variant_idx" ON "pricing_packages" USING btree ("class_type","duration_minutes","credits");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_packages_active_sort_idx" ON "pricing_packages" USING btree ("active","sort_order");--> statement-breakpoint
CREATE INDEX "recordings_session_idx" ON "recordings" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recordings_egress_idx" ON "recordings" USING btree ("egress_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_pairs_a_active_idx" ON "student_pairs" USING btree ("student_a_id") WHERE "student_pairs"."active";--> statement-breakpoint
CREATE UNIQUE INDEX "student_pairs_b_active_idx" ON "student_pairs" USING btree ("student_b_id") WHERE "student_pairs"."active";--> statement-breakpoint
CREATE INDEX "teacher_availability_teacher_idx" ON "teacher_availability" USING btree ("teacher_id","weekday");--> statement-breakpoint
ALTER TABLE "classroom_chat_messages" ADD CONSTRAINT "classroom_chat_messages_class_id_class_sessions_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;