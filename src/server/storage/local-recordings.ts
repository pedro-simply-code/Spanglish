import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const recordingsRoot = path.join(process.cwd(), "storage", "recordings");

export type LocalClassRecordingRef = {
  classId: string;
  userId: string;
  fileName: string;
};

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}

export async function saveLocalClassRecording(input: {
  classId: string;
  userId: string;
  fileName: string;
  body: Buffer;
}) {
  const dir = path.join(
    recordingsRoot,
    safeFileName(input.classId),
    safeFileName(input.userId),
  );
  await mkdir(dir, { recursive: true });

  const filePath = path.join(dir, safeFileName(input.fileName));
  await writeFile(filePath, input.body);

  return {
    relativePath: path
      .relative(process.cwd(), filePath)
      .split(path.sep)
      .join("/"),
    /** Key stored in `recordings.object_key` for local files. */
    key: [input.classId, input.userId, input.fileName].map(safeFileName).join("/"),
  };
}

/** Reference from a stored local key (`<classId>/<userId>/<file>`). */
export function localRecordingRef(key: string): LocalClassRecordingRef | null {
  const [classId, userId, fileName, ...rest] = key.split("/");
  if (!classId || !userId || !fileName || rest.length) return null;
  return { classId, userId, fileName };
}

function resolveRecordingFilePath(ref: LocalClassRecordingRef) {
  const filePath = path.resolve(
    recordingsRoot,
    safeFileName(ref.classId),
    safeFileName(ref.userId),
    safeFileName(ref.fileName),
  );

  const root = path.resolve(recordingsRoot);
  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    throw new Error("Invalid recording path");
  }

  return filePath;
}

function recordingContentType(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}

export async function readLocalClassRecording(ref: LocalClassRecordingRef) {
  const filePath = resolveRecordingFilePath(ref);
  const body = await readFile(filePath);

  return {
    body,
    contentType: recordingContentType(ref.fileName),
  };
}