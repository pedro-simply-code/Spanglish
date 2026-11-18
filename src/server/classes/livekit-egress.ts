import { randomUUID } from "node:crypto";
import {
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
  StreamOutput,
  StreamProtocol,
} from "@livekit/protocol";
import { and, eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import {
  getEgressClient,
  isLiveKitEgressConfigured,
  isLiveKitRtmpConfigured,
} from "@/server/classes/livekit-api";
import { classRoomName } from "@/server/classes/class-repository";
import { db } from "@/server/db";
import { recordings } from "@/server/db/schema";
import { b2Region, headRecordingObject } from "@/server/storage/b2";

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
    region: b2Region(),
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
  const t = await getTranslations("classroom");
  if (!isLiveKitEgressConfigured()) {
    return { ok: false as const, message: t("egress.configureAll") };
  }

  const egress = getEgressClient();
  const s3 = b2S3Upload();
  if (!egress || !s3) {
    return { ok: false as const, message: t("egress.notConfigured") };
  }
  if (await getActiveEgress(sessionId)) {
    return { ok: false as const, message: t("egress.alreadyActive") };
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
    message: t("egress.compositeStarted"),
    egressId: info.egressId,
  };
}

export async function startRoomRtmpStream(sessionId: string, actorUserId: string) {
  const t = await getTranslations("classroom");
  if (!isLiveKitRtmpConfigured()) {
    return { ok: false as const, message: t("egress.setRtmpUrl") };
  }

  const egress = getEgressClient();
  if (!egress || !env.LIVEKIT_RTMP_URL) {
    return { ok: false as const, message: t("egress.rtmpNotConfigured") };
  }
  if (await getActiveEgress(sessionId)) {
    return { ok: false as const, message: t("egress.alreadyActive") };
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

  return { ok: true as const, message: t("egress.rtmpStarted"), egressId: info.egressId };
}

export async function stopActiveEgress(sessionId: string) {
  const t = await getTranslations("classroom");
  const [active] = await db
    .select()
    .from(recordings)
    .where(and(eq(recordings.sessionId, sessionId), eq(recordings.status, "recording")))
    .limit(1);
  const egress = getEgressClient();
  if (!active?.egressId || !egress) {
    return { ok: false as const, message: t("egress.noActive") };
  }

  await egress.stopEgress(active.egressId);

  if (active.egressKind === "rtmp") {
    await db.delete(recordings).where(eq(recordings.id, active.id));
    return { ok: true as const, message: t("egress.rtmpStopped") };
  }

  // The file is final once LiveKit finishes uploading (webhook: egress_ended).
  await db.update(recordings).set({ status: "uploading" }).where(eq(recordings.id, active.id));
  return {
    ok: true as const,
    message: t("egress.recordingStopped"),
  };
}

const EGRESS_COMPLETE = 3;
const EGRESS_ENDED = new Set([3, 4, 5, 6]); // complete, failed, aborted, limit reached

/**
 * Fallback for the `egress_ended` webhook (which never arrives on localhost
 * or when the webhook URL is not set in LiveKit): asks LiveKit about cloud
 * recordings still marked as recording/uploading and settles them.
 */
export async function syncPendingEgressRecordings() {
  const egress = getEgressClient();
  if (!egress) return;
  const pending = await db
    .select()
    .from(recordings)
    .where(and(eq(recordings.egressKind, "file"), inArray(recordings.status, ["recording", "uploading"])))
    .limit(20);
  for (const row of pending) {
    if (!row.egressId) continue;
    try {
      const [info] = await egress.listEgress({ egressId: row.egressId });
      if (!info || !EGRESS_ENDED.has(info.status)) continue;
      const file = info.fileResults?.[0];
      // Trust the bucket: the file is there or it is not.
      const object = row.objectKey ? await headRecordingObject(row.objectKey) : null;
      const ok = info.status === EGRESS_COMPLETE && Boolean(object ?? file);
      await db
        .update(recordings)
        .set({
          status: ok ? "ready" : "failed",
          sizeBytes: object?.sizeBytes ?? (file ? Number(file.size) : null),
          completedAt: new Date(),
          error: ok ? null : (info.error || "LiveKit egress did not produce a file").slice(0, 500),
        })
        .where(eq(recordings.id, row.id));
    } catch (error) {
      console.warn("[egress] status check failed", row.egressId, error);
    }
  }
}
