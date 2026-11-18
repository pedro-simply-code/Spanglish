-- Live captions in the classroom + saved class transcript.
-- (The 0014 snapshot also catches up tables created in 0007-0013, which already exist.)
ALTER TABLE "class_sessions" ADD COLUMN IF NOT EXISTS "captions_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD COLUMN IF NOT EXISTS "captions_lang" text DEFAULT 'es-ES' NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "class_transcript_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"speaker_identity" text NOT NULL,
	"speaker_user_id" text,
	"speaker_name" text NOT NULL,
	"body" text NOT NULL,
	"lang" text NOT NULL,
	"spoken_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "class_transcript_segments" ADD CONSTRAINT "class_transcript_segments_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "class_transcript_segments" ADD CONSTRAINT "class_transcript_segments_speaker_user_id_users_id_fk" FOREIGN KEY ("speaker_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "class_transcript_segments_session_idx" ON "class_transcript_segments" USING btree ("session_id","spoken_at");
