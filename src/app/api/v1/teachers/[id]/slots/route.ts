import { listBookingSlotsAction } from "@/features/academy";
import { apiError, json, requireApiActor } from "@/server/api/http";

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/teachers/:id/slots?classType=one-on-one&duration=25
 * Free start times (UTC ISO) for the caller (and partner, for paired).
 */
export async function GET(request: Request, context: Context) {
  const guard = await requireApiActor({ permission: "classes:book" });
  if (guard.response) return guard.response;

  const url = new URL(request.url);
  const classType = url.searchParams.get("classType");
  const durationMinutes = Number(url.searchParams.get("duration"));
  if ((classType !== "one-on-one" && classType !== "paired") || ![25, 50].includes(durationMinutes)) {
    return apiError(400, "INVALID_INPUT", "Send classType (one-on-one|paired) and duration (25|50).");
  }

  const { id } = await context.params;
  const slots = await listBookingSlotsAction({ teacherId: id, classType, durationMinutes });
  return json({ slots });
}
