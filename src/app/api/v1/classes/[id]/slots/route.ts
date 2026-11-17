import { listRescheduleSlotsAction } from "@/features/classes";
import { json, requireApiActor } from "@/server/api/http";

type Context = { params: Promise<{ id: string }> };

/** GET /api/v1/classes/:id/slots — free times to move this class to. */
export async function GET(_request: Request, context: Context) {
  const guard = await requireApiActor({ permission: "classes:reschedule-own" });
  if (guard.response) return guard.response;

  const { id } = await context.params;
  return json({ slots: await listRescheduleSlotsAction(id) });
}
