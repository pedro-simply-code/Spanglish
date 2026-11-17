import { randomUUID } from "node:crypto";
import {
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
  StreamOutput,
  StreamProtocol,
} from "@livekit/protocol";
import { and, eq } from "drizzle-orm";
import { env } from "@/env";
import {
  getEgressClient,
  isLiveKitEgressConfigured,
  isLiveKitRtmpConfigured,
} from "@/server/classes/livekit-api";
import { classRoomName } from "@/server/classes/class-repository";
import { db } from "@/server/db";
import { recordings } from "@/server/db/schema";

/*
 * LiveKit egress: composite recordings straight to B2, and RTMP streams.
 * Active egresses are rows in `recordings` (status "recording"), so any
 * server instance can stop them; the LiveKit webhook marks files ready.
 */

function b2S3Upload() {
  if (!env.B2_KEY_ID || !env.B2_APPLICATION_KEY || !env.B2_BUCKET_NAME || !env.B2_S3_ENDPOINT) {
    return null;
  }

  return new S3Upload({
    accessKey: env.B2_KEY_ID,
    secret: env.B2_APPLICATION_KEY,
    bucket: env.B2_BUCKET_NAME,
    endpoint: env.B2_S3_ENDPOINT,
    region: env.B2_REGION,
    forcePathStyle: true,
  });
}

export async function getActiveEgress(sessionId: string) {
  const [row] = await db
    .select({ egressId: recordings.egressId, kind: recordings.egressKind })
    .from(recordings)
    .where(and(eq(recordings.sessionId, sessionId), eq(recordings.status, "recording")))
    .limit(1);
  return row?.egressId ? { egressId: row.egressId, kind: row.kind ?? "file" } : null;
}

export async function startRoomCompositeRecording(sessionId: string, actorUserId: string) {
  if (!isLiveKitEgressConfigured()) {
    return { ok: false as const, message: "Configure LiveKit and B2 for cloud composite recording." };
  }

  const egress = getEgressClient();
  const s3 = b2S3Upload();
  if (!egress || !s3) {
    return { ok: false as const, message: "Egress or B2 storage is not configured." };
  }
  if (await getActiveEgress(sessionId)) {
    return { ok: false as const, message: "This class is already being recorded or streamed." };
  }

  const recordingId = randomUUID();
  const objectKey = `recordings/${sessionId}/${recordingId}.mp4`;
  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: objectKey,
    output: { case: "s3", value: s3 },
  });

  const info = await egress.startRoomCompositeEgress(classRoomName(sessionId), output, {
    layout: "grid",
  });

  await db.insert(recordings).values({
    id: recordingId,
    sessionId,
    source: "egress",
    storage: "b2",
    objectKey,
    fileName: `${recordingId}.mp4`,
    contentType: "video/mp4",
    status: "recording",
    egressId: info.egressId || null,
    egressKind: "file",
    createdByUserId: actorUserId,
  });

  return {
    ok: true as const,
    message: "Cloud recording started (composite layout → B2).",
    egressId: info.egressId,
  };
}

export async function startRoomRtmpStream(sessionId: string, actorUserId: string) {
  if (!isLiveKitRtmpConfigured()) {
    return { ok: false as const, message: "Set LIVEKIT_RTMP_URL (e.g. YouTube ingest) to start RTMP egress." };
  }

  const egress = getEgressClient();
  if (!egress || !env.LIVEKIT_RTMP_URL) {
    return { ok: false as const, message: "RTMP egress is not configured." };
  }
  if (await getActiveEgress(sessionId)) {
    return { ok: false as const, message: "This class is already being recorded or streamed." };
  }

  const streamOutput = new StreamOutput({
    protocol: StreamProtocol.RTMP,
    urls: [env.LIVEKIT_RTMP_URL],
  });

  const info = await egress.startRoomCompositeEgress(classRoomName(sessionId), streamOutput, {
    layout: "speaker",
  });

  await db.insert(recordings).values({
    id: randomUUID(),
    sessionId,
    source: "egress",
    storage: "b2",
    status: "recording",
    egressId: info.egressId || null,
    egressKind: "rtmp",
    createdByUserId: actorUserId,
  });

  return { ok: true as const, message: "RTMP stream started.", egressId: info.egressId };
}

export async function stopActiveEgress(sessionId: string) {
  const [active] = await db
    .select()
    .from(recordings)
    .where(and(eq(recordings.sessionId, sessionId), eq(recordings.status, "recording")))
    .limit(1);
  const egress = getEgressClient();
  if (!active?.egressId || !egress) {
    return { ok: false as const, message: "No active egress for this class." };
  }

  await egress.stopEgress(active.egressId);

  if (active.egressKind === "rtmp") {
    await db.delete(recordings).where(eq(recordings.id, active.id));
    return { ok: true as const, message: "RTMP stream stopped." };
  }

  // The file is final once LiveKit finishes uploading (webhook: egress_ended).
  await db.update(recordings).set({ status: "uploading" }).where(eq(recordings.id, active.id));
  return {
    ok: true as const,
    message: "Cloud recording stopped. It appears in Recordings when processing completes.",
  };
}
