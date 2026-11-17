import { connection } from "next/server";
import { getActor } from "@/server/auth/session";
import { getRecordingForViewer } from "@/server/classes/recordings";
import { getRecordingDownloadUrl } from "@/server/storage/b2";
import {
  localRecordingRef,
  readLocalClassRecording,
} from "@/server/storage/local-recordings";

/** GET /api/class-recordings/download?id=<recordingId> — watch or download. */
export async function GET(request: Request) {
  await connection();

  const actor = await getActor();
  if (!actor) return new Response("Unauthorized", { status: 401 });

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return new Response("Missing recording id", { status: 400 });

  const recording = await getRecordingForViewer(actor, id);
  if (!recording?.objectKey) return new Response("Recording not found", { status: 404 });

  const fileName = recording.fileName ?? "recording.webm";

  if (recording.storage === "b2") {
    const url = await getRecordingDownloadUrl(recording.objectKey, fileName);
    if (!url) return new Response("Storage not configured", { status: 503 });
    return Response.redirect(url, 302);
  }

  const ref = localRecordingRef(recording.objectKey);
  if (!ref) return new Response("Recording not found", { status: 404 });
  try {
    const { body, contentType } = await readLocalClassRecording(ref);
    return new Response(body, {
      headers: {
        "Content-Type": recording.contentType ?? contentType,
        "Content-Disposition": `inline; filename="${fileName.replace(/[^\w.-]/g, "_")}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return new Response("Recording not found", { status: 404 });
  }
}
