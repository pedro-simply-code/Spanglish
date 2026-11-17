import { WebhookReceiver } from "livekit-server-sdk";
import { and, eq, or } from "drizzle-orm";
import { env } from "@/env";
import { isStaffGuestIdentity } from "@/lib/classroom-identities";
import { recordAuditEvent } from "@/server/audit/audit-log";
import {
  recordParticipantJoined,
  recordParticipantLeft,
} from "@/server/classes/attendance";
import { endClassLiveSession } from "@/server/classes/class-live-session";
import { sessionIdFromRoomName } from "@/server/classes/class-repository";
import { db } from "@/server/db";
import { recordings } from "@/server/db/schema";

/**
 * LiveKit webhooks: attendance (participant_joined / participant_left), the
 * end of a class (room_finished) and finished recordings (egress_ended).
 * Configure in LiveKit Cloud → Settings → Webhooks with the URL
 *   https://<your-domain>/api/webhooks/livekit
 * LiveKit signs each call with the project's API key and secret.
 */

const EGRESS_COMPLETE = 3;

export async function POST(request: Request) {
  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    return new Response("LiveKit is not configured", { status: 503 });
  }

  const body = await request.text();
  const receiver = new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  let event;
  try {
    event = await receiver.receive(body, request.headers.get("authorization") ?? undefined);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const at = event.createdAt ? new Date(Number(event.createdAt) * 1000) : new Date();
  const sessionId = sessionIdFromRoomName(event.room?.name ?? event.egressInfo?.roomName ?? "");

  switch (event.event) {
    case "participant_joined":
    case "participant_left": {
      const identity = event.participant?.identity ?? "";
      // Students join with their user id; guests and staff observers do not count.
      if (!sessionId || !identity || identity.startsWith("guest-") || isStaffGuestIdentity(identity)) break;
      if (event.event === "participant_joined") await recordParticipantJoined(sessionId, identity, at);
      else await recordParticipantLeft(sessionId, identity, at);
      break;
    }
    case "room_finished": {
      if (sessionId) await endClassLiveSession(sessionId);
      break;
    }
    case "egress_ended": {
      const info = event.egressInfo;
      if (!info?.egressId) break;
      const file = info.fileResults?.[0];
      const done = info.status === EGRESS_COMPLETE && Boolean(file);
      const updated = await db
        .update(recordings)
        .set({
          status: done ? "ready" : "failed",
          sizeBytes: file ? Number(file.size) : null,
          completedAt: new Date(),
        })
        .where(
          and(
            eq(recordings.egressId, info.egressId),
            eq(recordings.egressKind, "file"),
            or(eq(recordings.status, "recording"), eq(recordings.status, "uploading")),
          ),
        )
        .returning({ id: recordings.id, sessionId: recordings.sessionId });
      for (const row of updated) {
        await recordAuditEvent({
          action: "recording.saved",
          targetType: "class",
          targetId: row.sessionId,
          metadata: { recordingId: row.id, source: "egress", ok: done },
        });
      }
      break;
    }
    default:
      break;
  }

  return Response.json({ ok: true });
}
