CREATE TABLE IF NOT EXISTS "teacher_invitations" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "invited_by_user_id" text,
  "invite_note" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "accepted_application_id" text
);

ALTER TABLE "teacher_invitations" ADD CONSTRAINT "teacher_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "teacher_invitations" ADD CONSTRAINT "teacher_invitations_accepted_application_id_teacher_applications_id_fk" FOREIGN KEY ("accepted_application_id") REFERENCES "teacher_applications"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "teacher_invitations_open_email_idx" ON "teacher_invitations" (lower("email")) WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS "teacher_invitations_status_idx" ON "teacher_invitations" ("status", "created_at");