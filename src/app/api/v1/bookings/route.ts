import { z } from "zod";
import { bookClassForActor, getClassStatus } from "@/features/classes";
import { appNow } from "@/lib/app-clock";
import {
  apiError,
  bookingErrorStatus,
  json,
  readJson,
  requireApiActor,
} from "@/server/api/http";

const bodySchema = z.object({
  teacherId: z.string().min(1),
  startsAt: z.iso.datetime({ offset: true }),
  classType: z.enum(["one-on-one", "paired"]),
  durationMinutes: z.union([z.literal(25), z.literal(50)]),
  topic: z.string().min(3).max(140),
});

/** POST /api/v1/bookings — books a class and spends one credit. */
export async function POST(request: Request) {
  const guard = await requireApiActor({ permission: "classes:book" });
  if (guard.response) return guard.response;

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiError(400, "INVALID_INPUT", "Send teacherId, startsAt, classType, durationMinutes and topic.");
  }

  const { classType, durationMinutes, ...rest } = parsed.data;
  const result = await bookClassForActor(guard.actor, { ...rest, kind: { classType, durationMinutes } });
  if (!result.ok) return apiError(bookingErrorStatus[result.code] ?? 409, result.code, result.message);

  return json(
    {
      message: result.message,
      class: { ...result.liveClass, status: getClassStatus(result.liveClass, appNow()) },
    },
    { status: 201 },
  );
}
