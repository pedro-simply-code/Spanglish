-- A teacher can never have two scheduled classes that overlap. Postgres
-- rejects the second booking even when both arrive at the same time.
-- Canceled classes free their time.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "class_sessions"
  ADD CONSTRAINT "class_sessions_teacher_no_overlap"
  EXCLUDE USING gist (
    "teacher_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" = 'scheduled');
