ALTER TABLE "teacher_applications" ADD COLUMN IF NOT EXISTS "track" text DEFAULT 'conversation' NOT NULL;
ALTER TABLE "teacher_applications" ADD COLUMN IF NOT EXISTS "fluency" text DEFAULT 'native' NOT NULL;
ALTER TABLE "teacher_applications" ADD COLUMN IF NOT EXISTS "fluency_note" text DEFAULT '' NOT NULL;
ALTER TABLE "teacher_applications" ADD COLUMN IF NOT EXISTS "years_teaching" integer DEFAULT 0 NOT NULL;
ALTER TABLE "teacher_applications" ADD COLUMN IF NOT EXISTS "taught_online_before" boolean DEFAULT false NOT NULL;
ALTER TABLE "teacher_applications" ADD COLUMN IF NOT EXISTS "credentials" jsonb DEFAULT '[]'::jsonb NOT NULL;