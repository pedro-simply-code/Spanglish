import { timingSafeEqual } from "node:crypto";
import { env } from "@/env";
import { scheduleLessonSummary } from "@/server/ai/lesson-summary";
import { saveAgentTranscript, type AgentTranscriptLine } from "@/server/classes/agent-transcript";
import { sessionIdFromRoomName } from "@/server/classes/class-repository";

/*
 * POST /api/agent/transcript — the classroom agent (agent/classroom-agent.ts)
 * sends the finished lines of a class here, a few at a time.
 * Header: Authorization: Bearer <CLASSROOM_AGENT_SECRET>
 * Body: { room, lines: [{ id, identity, name, text, lang, at }], ended? }
 * `ended: true` comes with the last lines, when the class room closes: the
 * summary is written then.
 */

function authorized(request: Request) {
  if (!env.CLASSROOM_AGENT_SECRET) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.CLASSROOM_AGENT_SECRET}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  if (!env.CLASSROOM_AGENT_SECRET) return new Response("CLASSROOM_AGENT_SECRET is not set", { status: 503 });
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

  let body: { room?: unknown; lines?: unknown; ended?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const sessionId = sessionIdFromRoomName(String(body.room ?? ""));
  if (!sessionId) return Response.json({ error: "Not a class room" }, { status: 400 });

  const lines = Array.isArray(body.lines) ? (body.lines as AgentTranscriptLine[]) : [];
  const result = await saveAgentTranscript(sessionId, lines);
  if (!result) return Response.json({ error: "Class not found" }, { status: 404 });

  if (body.ended === true) scheduleLessonSummary(sessionId);
  return Response.json({ saved: result.saved });
}
