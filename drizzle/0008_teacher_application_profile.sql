ALTER TABLE "teacher_applications" ADD COLUMN IF NOT EXISTS "track" text DEFAULT 'conversation' NOT NULL;
--> statement-breakpoint
ALTER TABLE "teacher_applications" ADD COLUMN IF NOT EXISTS "fluency" text DEFAULT 'native' NOT NULL;
--> statement-breakpoint
ALTER TABLE "teacher_applications" ADD COLUMN IF NOT EXISTS "fluency_note" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "teacher_applications" ADD COLUMN IF NOT EXISTS "years_teaching" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "teacher_applications" ADD COLUMN IF NOT EXISTS "taught_online_before" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "teacher_applications" ADD COLUMN IF NOT EXISTS "credentials" jsonb DEFAULT '[]'::jsonb NOT NULL;
