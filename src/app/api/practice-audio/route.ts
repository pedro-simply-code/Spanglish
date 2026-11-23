import { connection } from "next/server";
import { env } from "@/env";
import { MAX_PRACTICE_AUDIO_BYTES } from "@/lib/practice-games";
import { apiError, json, requireApiActor } from "@/server/api/http";
import { getActorWithPermission } from "@/server/auth/session";
import { openPracticeAudio, savePracticeAudio } from "@/server/storage/practice-audio";

/*
 * Practice recordings (words and phrases a teacher records for the games).
 *   POST  multipart "file" (teachers) → { key }
 *   GET   ?key=…  (signed in) → plays the clip
 */

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = new URL(origin).host;
  return [request.headers.get("host"), request.headers.get("x-forwarded-host"), new URL(env.NEXT_PUBLIC_APP_URL).host].includes(host);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError(403, "FORBIDDEN", "Cross-site request.");
  const guard = await requireApiActor({ permission: "materials:write" });
  if (guard.response) return guard.response;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob) || !file.size) return apiError(400, "MISSING_FILE", "Record something first.");
  if (file.size > MAX_PRACTICE_AUDIO_BYTES) return apiError(413, "TOO_LARGE", "The recording is too long.");
  const key = await savePracticeAudio(Buffer.from(await file.arrayBuffer()), file.type);
  if (!key) return apiError(415, "UNSUPPORTED_TYPE", "Unsupported audio format.");
  return json({ key });
}

export async function GET(request: Request) {
  await connection();
  const actor = await getActorWithPermission("materials:read");
  if (!actor) return new Response("Unauthorized", { status: 401 });
  const key = new URL(request.url).searchParams.get("key") ?? "";
  const audio = await openPracticeAudio(key);
  if (!audio) return new Response("Not found", { status: 404 });
  if ("url" in audio && audio.url) return Response.redirect(audio.url, 302);
  return new Response(new Uint8Array(audio.body!), {
    headers: {
      "Content-Type": audio.contentType!,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
