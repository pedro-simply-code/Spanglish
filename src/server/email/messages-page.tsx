import { EmailMailbox } from "@/features/email";
import { getActor } from "@/server/auth/session";
import { listMailboxForUser } from "@/server/messages/mailbox";

export async function EmailAppContent() {
  const actor = await getActor();
  const emails = await listMailboxForUser(actor.userId);
  return <EmailMailbox initialEmails={emails} />;
}