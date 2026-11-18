import { syncPendingEgressRecordings } from "@/server/classes/livekit-egress";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import type { AuthSession } from "@/lib/auth-types";
import { hasPermission, hasRole } from "@/lib/auth-roles";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { getSessionAccess } from "@/server/classes/class-repository";
import { db } from "@/server/db";
import {
  classParticipants,
  classSessions,
  recordings,
  users,
  type RecordingRow,
} from "@/server/db/schema";
import {
  createRecordingUploadUrl,
  headRecordingObject,
  isBackblazeConfigured,
  MAX_RECORDING_UPLOAD_BYTES,
} from "@/server/storage/b2";

/*
 * Class recordings. Only the class's teacher (with recordings:manage) saves
 * them: LiveKit egress (server side) or a browser recording uploaded straight
 * to B2 with a signed URL. Participants, the teacher and staff can watch.
 */

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "recording.webm";
}

/** The actor may save recordings for this class. */
export async function canRecordClass(actor: AuthSession, sessionId: string) {
  if (!hasPermission(actor.roles, "recordings:manage")) return false;
  const access = await getSessionAccess(sessionId);
  return Boolean(access && access.row.teacherId === actor.userId);
}

/** The actor may watch this class's recordings. */
export async function canWatchClass(actor: AuthSession, sessionId: string) {
  const access = await getSessionAccess(sessionId);
  if (!access) return false;
  return (
    access.row.teacherId === actor.userId ||
    access.participantIds.includes(actor.userId) ||
    hasRole(actor.roles, "manager") ||
    hasRole(actor.roles, "admin")
  );
}

export type UploadTicket =
  | { ok: true; recordingId: string; uploadUrl: string; contentType: string }
  | { ok: false; message: string };

export async function startBrowserUpload(
  actor: AuthSession,
  input: { classId: string; fileName: string; sizeBytes: number; contentType: string },
): Promise<UploadTicket> {
  const t = await getTranslations("ops.recordings");
  if (!isBackblazeConfigured()) {
    return { ok: false, message: t("missingCredentials") };
  }
  if (!(await canRecordClass(actor, input.classId))) {
    return { ok: false, message: t("teacherOnly") };
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_RECORDING_UPLOAD_BYTES) {
    return { ok: false, message: t("invalidSize") };
  }
  const contentType = /^video\/(webm|mp4)$/.test(input.contentType.split(";")[0] ?? "")
    ? input.contentType.split(";")[0]!
    : "video/webm";

  const recordingId = randomUUID();
  const fileName = safeFileName(input.fileName);
  const objectKey = `recordings/${input.classId}/${recordingId}-${fileName}`;
  const uploadUrl = await createRecordingUploadUrl({
    key: objectKey,
    contentType,
    sizeBytes: input.sizeBytes,
  });

  await db.insert(recordings).values({
    id: recordingId,
    sessionId: input.classId,
    source: "browser",
    storage: "b2",
    objectKey,
    fileName,
    contentType,
    sizeBytes: input.sizeBytes,
    status: "uploading",
    createdByUserId: actor.userId,
  });

  return { ok: true, recordingId, uploadUrl, contentType };
}

/** Called after the browser PUT: checks the object really is in B2. */
export async function finishBrowserUpload(actor: AuthSession, recordingId: string) {
  const t = await getTranslations("ops.recordings");
  const [row] = await db
    .select()
    .from(recordings)
    .where(and(eq(recordings.id, recordingId), eq(recordings.createdByUserId, actor.userId)))
    .limit(1);
  if (!row?.objectKey || row.status !== "uploading") {
    return { ok: false as const, message: t("uploadNotFound") };
  }

  const head = await headRecordingObject(row.objectKey);
  if (!head) {
    await db.update(recordings).set({ status: "failed" }).where(eq(recordings.id, row.id));
    return { ok: false as const, message: t("fileNotStored") };
  }

  await db
    .update(recordings)
    .set({ status: "ready", sizeBytes: head.sizeBytes, completedAt: new Date() })
    .where(eq(recordings.id, row.id));
  await recordAuditEvent({
    action: "recording.saved",
    actorUserId: actor.userId,
    targetType: "class",
    targetId: row.sessionId,
    metadata: { recordingId: row.id, source: "browser", sizeBytes: head.sizeBytes },
  });
  return { ok: true as const, message: t("saved") };
}

/** Local-disk recordings (RECORDING_STORAGE=local) are rows too. */
export async function registerLocalRecording(input: {
  actor: AuthSession;
  classId: string;
  key: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
}) {
  const id = randomUUID();
  await db.insert(recordings).values({
    id,
    sessionId: input.classId,
    source: "browser",
    storage: "local",
    objectKey: input.key,
    fileName: input.fileName,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    status: "ready",
    createdByUserId: input.actor.userId,
    completedAt: new Date(),
  });
  return id;
}

export type RecordingListEntry = {
  id: string;
  classId: string;
  classTopic: string;
  classStartsAt: string;
  teacherName: string;
  source: RecordingRow["source"];
  status: RecordingRow["status"];
  fileName: string | null;
  sizeBytes: number | null;
  createdAt: string;
  error: string | null;
  storage: RecordingRow["storage"];
  /** Students booked into the class (the teacher is excluded). */
  students: { id: string; name: string }[];
};

/** Recordings of the classes the actor teaches, takes part in, or (staff) all. */
export async function listRecordingsForActor(actor: AuthSession, limit = 1000) {
  // Settle cloud recordings whose LiveKit webhook did not arrive.
  await syncPendingEgressRecordings().catch(() => undefined);
  const staff = hasRole(actor.roles, "manager") || hasRole(actor.roles, "admin");

  let sessionFilter;
  if (!staff) {
    const ids = await db
      .select({ id: classParticipants.sessionId })
      .from(classParticipants)
      .where(eq(classParticipants.userId, actor.userId));
    const sessionIds = ids.map((row) => row.id);
    sessionFilter = or(
      eq(classSessions.teacherId, actor.userId),
      sessionIds.length ? inArray(classSessions.id, sessionIds) : undefined,
    );
  }

  const rows = await db
    .select({
      recording: recordings,
      topic: classSessions.topic,
      startsAt: classSessions.startsAt,
      teacherId: classSessions.teacherId,
      teacherName: users.name,
    })
    .from(recordings)
    .innerJoin(classSessions, eq(classSessions.id, recordings.sessionId))
    .innerJoin(users, eq(users.id, classSessions.teacherId))
    .where(
      and(
        or(isNull(recordings.egressKind), eq(recordings.egressKind, "file")),
        sessionFilter,
      ),
    )
    .orderBy(desc(recordings.createdAt))
    .limit(limit);

  const sessionIds = [...new Set(rows.map((row) => row.recording.sessionId))];
  const participantRows = sessionIds.length
    ? await db
        .select({
          sessionId: classParticipants.sessionId,
          id: users.id,
          name: users.name,
        })
        .from(classParticipants)
        .innerJoin(users, eq(users.id, classParticipants.userId))
        .where(inArray(classParticipants.sessionId, sessionIds))
    : [];
  const studentsBySession = new Map<string, { id: string; name: string }[]>();
  for (const row of participantRows) {
    const list = studentsBySession.get(row.sessionId) ?? [];
    list.push({ id: row.id, name: row.name });
    studentsBySession.set(row.sessionId, list);
  }

  return rows.map(
    (row): RecordingListEntry => ({
      id: row.recording.id,
      classId: row.recording.sessionId,
      classTopic: row.topic,
      classStartsAt: row.startsAt.toISOString(),
      teacherName: row.teacherName,
      source: row.recording.source,
      status: row.recording.status,
      fileName: row.recording.fileName,
      sizeBytes: row.recording.sizeBytes,
      createdAt: row.recording.createdAt.toISOString(),
      error: row.recording.error,
      storage: row.recording.storage,
      students: (studentsBySession.get(row.recording.sessionId) ?? []).filter(
        (student) => student.id !== row.teacherId,
      ),
    }),
  );
}

export async function getRecordingForViewer(actor: AuthSession, recordingId: string) {
  const [row] = await db.select().from(recordings).where(eq(recordings.id, recordingId)).limit(1);
  if (!row || row.status !== "ready" || !row.objectKey) return null;
  return (await canWatchClass(actor, row.sessionId)) ? row : null;
}

export type ClassRecordingView = {
  id: string;
  status: "recording" | "uploading" | "ready" | "failed";
  source: "egress" | "browser";
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

/**
 * Recordings of one class for the class page, oldest first (a class recorded
 * in two parts shows "Part 1", "Part 2"). Only people who may watch the class
 * get them; failed attempts are left out.
 */
export async function listClassRecordings(actor: AuthSession, sessionId: string): Promise<ClassRecordingView[]> {
  if (!(await canWatchClass(actor, sessionId))) return [];
  await syncPendingEgressRecordings().catch(() => undefined);
  const rows = await db
    .select()
    .from(recordings)
    .where(
      and(
        eq(recordings.sessionId, sessionId),
        or(isNull(recordings.egressKind), eq(recordings.egressKind, "file")),
        inArray(recordings.status, ["recording", "uploading", "ready"]),
      ),
    )
    .orderBy(asc(recordings.createdAt));
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    source: row.source,
    fileName: row.fileName,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
  }));
}
