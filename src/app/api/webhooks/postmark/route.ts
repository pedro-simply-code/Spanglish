import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import { normalizeEmail } from "@/lib/auth-validation";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

/**
 * Postmark bounce and spam-complaint webhook. Configure in Postmark →
 * Servers → Webhooks with the URL
 *   https://postmark:<POSTMARK_WEBHOOK_SECRET>@<your-domain>/api/webhooks/postmark
 * and the "Bounce" and "Spam complaint" events.
 *
 * Hard bounces and complaints mark the address so security notices stop
 * going to it (sign-in codes are still sent: the user may fix the inbox).
 */

const permanentBounceTypes = new Set([
  "HardBounce",
  "BadEmailAddress",
  "ManuallyDeactivated",
  "SpamNotification",
  "Blocked",
]);

function authorized(request: Request) {
  const secret = env.POSTMARK_WEBHOOK_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const password = decoded.slice(decoded.indexOf(":") + 1);
  const expected = Buffer.from(secret);
  const actual = Buffer.from(password);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

type PostmarkEvent = {
  RecordType?: string;
  Type?: string;
  Email?: string;
};

export async function POST(request: Request) {
  if (!authorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const event = (await request.json().catch(() => null)) as PostmarkEvent | null;
  if (!event?.Email || !event.RecordType) {
    return new Response("Ignored", { status: 200 });
  }

  const permanent =
    event.RecordType === "SpamComplaint" ||
    (event.RecordType === "Bounce" && permanentBounceTypes.has(event.Type ?? ""));
  if (!permanent) {
    return new Response("Ignored", { status: 200 });
  }

  const email = normalizeEmail(event.Email);
  const [user] = await db
    .update(users)
    .set({ emailBouncedAt: new Date() })
    .where(eq(users.email, email))
    .returning({ id: users.id });

  await recordAuditEvent({
    action: "email.bounced",
    severity: "warning",
    actorUserId: user?.id ?? null,
    metadata: { email, recordType: event.RecordType, type: event.Type ?? null },
  });

  return new Response("OK", { status: 200 });
}
