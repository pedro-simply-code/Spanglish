import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { apiError, readJson, requireApiActor } from "@/server/api/http";
import { voiceTurn } from "@/server/ai/voice-practice";

/*
 * POST /api/ai/voice/turn — one turn of "Habla con la IA" (Luna).
 * Body: { conversationId, text, help }. The answer is a stream of JSON lines
 * so the browser can speak each sentence as soon as it arrives:
 *   {"t":"text","v":"…"}                      words Luna says (in pieces)
 *   {"t":"done","messageId":"…","finished":b} saved; finished = report written
 *   {"t":"error","message":"…"}               shown to the student
 */

/** Same-site requests only (the session cookie is sent automatically). */
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = new URL(origin).host;
  const allowed = [
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
    new URL(env.NEXT_PUBLIC_APP_URL).host,
  ];
  return allowed.includes(host);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError(403, "FORBIDDEN", "Cross-site request.");
  const guard = await requireApiActor({ permission: "ai:practice" });
  if (guard.response) return guard.response;
  const actor = guard.actor;

  const body = (await readJson(request)) as { conversationId?: unknown; text?: unknown; help?: unknown } | null;
  const input = {
    conversationId: String(body?.conversationId ?? ""),
    text: String(body?.text ?? ""),
    help: body?.help === true,
    locale: actor.locale,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const result = await voiceTurn(actor, input, (piece) => send({ t: "text", v: piece }));
        if (result.ok) {
          send({ t: "done", ...result.data });
        } else {
          const t = await getTranslations({ locale: actor.locale, namespace: "student.ai.errors" });
          send({ t: "error", message: t(result.error as Parameters<typeof t>[0]) });
        }
      } catch (error) {
        console.error("[ai-practice] voice turn", error instanceof Error ? error.message : error);
        const t = await getTranslations({ locale: actor.locale, namespace: "student.ai.errors" });
        send({ t: "error", message: t("ai_error") });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      // Don't let proxies buffer the stream.
      "x-accel-buffering": "no",
    },
  });
}
