CREATE TABLE "class_ratings" (
	"session_id" text NOT NULL,
	"student_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"stars" smallint NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_ratings_session_id_student_id_pk" PRIMARY KEY("session_id","student_id"),
	CONSTRAINT "class_ratings_stars" CHECK ("class_ratings"."stars" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "payout_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'awaiting_approval' NOT NULL,
	"total_cents" integer NOT NULL,
	"teacher_count" integer NOT NULL,
	"class_count" integer NOT NULL,
	"created_by_user_id" text,
	"approved_by_user_id" text,
	"approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"paid_reference" text,
	"rejected_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"rate_25_cents" integer NOT NULL,
	"rate_50_cents" integer NOT NULL,
	"paired_percent" integer NOT NULL,
	"updated_by_user_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"headline" text NOT NULL,
	"bio" text NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"teaches" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"experience" text DEFAULT '' NOT NULL,
	"video_url" text,
	"reviewer_user_id" text,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "teacher_earnings" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"class_type" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"base_cents" integer NOT NULL,
	"level_percent" integer NOT NULL,
	"level" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"class_ended_at" timestamp with time zone NOT NULL,
	"payout_batch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "level" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "href" text;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "status" text DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "visibility" text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "moderation" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "reviewed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "class_ratings" ADD CONSTRAINT "class_ratings_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_ratings" ADD CONSTRAINT "class_ratings_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_ratings" ADD CONSTRAINT "class_ratings_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_batches" ADD CONSTRAINT "payout_batches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_batches" ADD CONSTRAINT "payout_batches_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_settings" ADD CONSTRAINT "payout_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_applications" ADD CONSTRAINT "teacher_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_applications" ADD CONSTRAINT "teacher_applications_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_earnings" ADD CONSTRAINT "teacher_earnings_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_earnings" ADD CONSTRAINT "teacher_earnings_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_ratings_teacher_idx" ON "class_ratings" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "payout_batches_status_idx" ON "payout_batches" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_applications_one_open_idx" ON "teacher_applications" USING btree ("user_id") WHERE "teacher_applications"."status" = 'submitted';--> statement-breakpoint
CREATE INDEX "teacher_applications_status_idx" ON "teacher_applications" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_earnings_session_idx" ON "teacher_earnings" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "teacher_earnings_teacher_idx" ON "teacher_earnings" USING btree ("teacher_id","class_ended_at");--> statement-breakpoint
CREATE INDEX "teacher_earnings_batch_idx" ON "teacher_earnings" USING btree ("payout_batch_id");--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "materials_author_idx" ON "materials" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "materials_visibility_idx" ON "materials" USING btree ("visibility","moderation");