import type { StoredClassRecording } from "@/features/recordings/types";
import { classRecordingDownloadUrl } from "@/features/recordings/urls";
import type { AuthSession } from "@/lib/auth-types";
import { listRecordingsForActor } from "@/server/classes/recordings";

export async function loadStoredClassRecordingsForActor(
  actor: AuthSession,
): Promise<StoredClassRecording[]> {
  const rows = await listRecordingsForActor(actor);
  return rows.map((row) => ({
    id: row.id,
    classId: row.classId,
    fileName: row.fileName ?? "recording",
    sizeBytes: row.sizeBytes ?? 0,
    createdAt: row.createdAt,
    classTopic: row.classTopic,
    teacherName: row.teacherName,
    source: row.source,
    status: row.status,
    downloadUrl: row.status === "ready" ? classRecordingDownloadUrl(row.id) : null,
  }));
}
