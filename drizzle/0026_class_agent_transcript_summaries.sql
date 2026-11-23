CREATE TABLE "class_summaries" (
	"session_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"content_en" jsonb,
	"content_es" jsonb,
	"line_count" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_micros" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_transcript_segments" ADD COLUMN "speaker_role" text;--> statement-breakpoint
ALTER TABLE "class_summaries" ADD CONSTRAINT "class_summaries_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;