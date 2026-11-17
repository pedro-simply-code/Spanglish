import { z } from "zod";
import { cancelClassForActor, getClassStatus } from "@/features/classes";
import { appNow } from "@/lib/app-clock";
import {
  apiError,
  bookingErrorStatus,
  json,
  readJson,
  requireApiActor,
} from "@/server/api/http";

type Context = { params: Promise<{ id: string }> };

const bodySchema = z.object({ reason: z.string().max(500).optional() }).nullable();


/** POST /api/v1/classes/:id/cancel — same rules as the web (cutoff hours). */
export async function POST(request: Request, context: Context) {
  const guard = await requireApiActor({ permission: "classes:cancel-own" });
  if (guard.response) return guard.response;

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(400, "INVALID_INPUT", "Invalid body.");

  const { id } = await context.params;
  const result = await cancelClassForActor(guard.actor, {
    classId: id,
    reason: parsed.data?.reason,
  });
  if (!result.ok) return apiError(bookingErrorStatus[result.code] ?? 409, result.code, result.message);

  return json({
    message: result.message,
    class: { ...result.liveClass, status: getClassStatus(result.liveClass, appNow()) },
  });
}
