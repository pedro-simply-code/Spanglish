CREATE TABLE IF NOT EXISTS "academy_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "sender_user_id" text NOT NULL,
  "recipient_user_id" text NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "read_at" timestamp with time zone,
  "starred_by_recipient" boolean DEFAULT false NOT NULL,
  "important_by_recipient" boolean DEFAULT false NOT NULL,
  "sender_trashed_at" timestamp with time zone,
  "recipient_trashed_at" timestamp with time zone,
  "external_delivered" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "academy_messages" ADD CONSTRAINT "academy_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "academy_messages" ADD CONSTRAINT "academy_messages_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "academy_messages_recipient_idx" ON "academy_messages" ("recipient_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "academy_messages_sender_idx" ON "academy_messages" ("sender_user_id", "created_at");