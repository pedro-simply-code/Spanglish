CREATE TABLE "assignment_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"student_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"score" integer,
	"max_score" integer NOT NULL,
	"feedback" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"graded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"material_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"title" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"questions" jsonb NOT NULL,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_vocabulary" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"term" text NOT NULL,
	"translation" text DEFAULT '' NOT NULL,
	"example" text DEFAULT '' NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_words" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"term" text NOT NULL,
	"translation" text DEFAULT '' NOT NULL,
	"example" text DEFAULT '' NOT NULL,
	"source_session_id" text,
	"source_vocab_id" text,
	"box" smallint DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"review_count" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_vocabulary" ADD CONSTRAINT "class_vocabulary_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_vocabulary" ADD CONSTRAINT "class_vocabulary_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_words" ADD CONSTRAINT "student_words_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_words" ADD CONSTRAINT "student_words_source_session_id_class_sessions_id_fk" FOREIGN KEY ("source_session_id") REFERENCES "public"."class_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_words" ADD CONSTRAINT "student_words_source_vocab_id_class_vocabulary_id_fk" FOREIGN KEY ("source_vocab_id") REFERENCES "public"."class_vocabulary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_submissions_unique_idx" ON "assignment_submissions" USING btree ("assignment_id","student_id");--> statement-breakpoint
CREATE INDEX "assignment_submissions_student_idx" ON "assignment_submissions" USING btree ("student_id","submitted_at");--> statement-breakpoint
CREATE INDEX "assignments_session_idx" ON "assignments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "assignments_teacher_idx" ON "assignments" USING btree ("teacher_id","created_at");--> statement-breakpoint
CREATE INDEX "class_vocabulary_session_idx" ON "class_vocabulary" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "student_words_student_due_idx" ON "student_words" USING btree ("student_id","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "student_words_source_idx" ON "student_words" USING btree ("student_id","source_vocab_id");