import { z } from "zod";
import { getClassStatus, rescheduleClassForActor } from "@/features/classes";
import { appNow } from "@/lib/app-clock";
import {
  apiError,
  bookingErrorStatus,
  json,
  readJson,
  requireApiActor,
} from "@/server/api/http";

type Context = { params: Promise<{ id: string }> };

const bodySchema = z.object({ startsAt: z.iso.datetime({ offset: true }) });


/**
 * POST /api/v1/classes/:id/reschedule — body: { startsAt } (one of the times
 * from GET /api/v1/classes/:id/slots). Paired classes return a proposal the
 * partner must accept.
 */
export async function POST(request: Request, context: Context) {
  const guard = await requireApiActor({ permission: "classes:reschedule-own" });
  if (guard.response) return guard.response;

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(400, "INVALID_INPUT", "Send startsAt (ISO time).");

  const { id } = await context.params;
  const result = await rescheduleClassForActor(guard.actor, { classId: id, ...parsed.data });
  if (!result.ok) return apiError(bookingErrorStatus[result.code] ?? 409, result.code, result.message);

  return json({
    message: result.message,
    class: { ...result.liveClass, status: getClassStatus(result.liveClass, appNow()) },
  });
}
