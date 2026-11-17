CREATE TABLE IF NOT EXISTS "manager_invitations" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "token" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "invited_by_user_id" text,
  "invite_note" text DEFAULT '' NOT NULL,
  "experience_note" text,
  "accepted_by_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone
);

ALTER TABLE "manager_invitations" ADD CONSTRAINT "manager_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "manager_invitations" ADD CONSTRAINT "manager_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "manager_invitations_token_idx" ON "manager_invitations" ("token");
CREATE UNIQUE INDEX IF NOT EXISTS "manager_invitations_open_email_idx" ON "manager_invitations" (lower("email")) WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS "manager_invitations_status_idx" ON "manager_invitations" ("status", "created_at");