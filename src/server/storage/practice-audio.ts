import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getB2PlaybackUrl, isBackblazeConfigured, putB2Object } from "@/server/storage/b2";

/*
 * Teachers' recordings of words and phrases for practice games. Short clips
 * (≤ 1 MB): uploaded through our server to B2, or to ./storage/practice-audio
 * when B2 is not configured (local development).
 */

const KEY_PATTERN = /^practice-audio\/[a-f0-9-]{36}\.(webm|ogg|mp4|m4a|mp3|wav)$/;
const localRoot = path.join(process.cwd(), "storage");

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

const CONTENT_TYPES: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  mp4: "audio/mp4",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

export const isPracticeAudioKey = (key: string) => KEY_PATTERN.test(key);

/** Saves a recording and returns its key, or null for an unsupported type. */
export async function savePracticeAudio(body: Buffer, contentType: string) {
  const base = contentType.split(";")[0]!.trim().toLowerCase();
  const extension = EXTENSIONS[base];
  if (!extension) return null;
  const key = `practice-audio/${randomUUID()}.${extension}`;
  if (isBackblazeConfigured()) {
    await putB2Object({ key, body, contentType: base });
  } else {
    const filePath = path.join(localRoot, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
  }
  return key;
}

/** Where to play a recording: a signed B2 link, or the local file's bytes. */
export async function openPracticeAudio(key: string) {
  if (!isPracticeAudioKey(key)) return null;
  if (isBackblazeConfigured()) {
    const url = await getB2PlaybackUrl(key);
    return url ? { url } : null;
  }
  try {
    const body = await readFile(path.join(localRoot, key));
    return { body, contentType: CONTENT_TYPES[key.split(".").pop()!] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}
