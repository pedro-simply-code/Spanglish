import { getClassStatus, getJoinState, loadClassForActor } from "@/features/classes";
import { appNow } from "@/lib/app-clock";
import { apiError, json, requireApiActor } from "@/server/api/http";
import { getClassPolicy } from "@/server/classes/class-policy";

type Context = { params: Promise<{ id: string }> };

/** GET /api/v1/classes/:id — one class, its status and join window. */
export async function GET(_request: Request, context: Context) {
  const guard = await requireApiActor({ permission: "classes:view-own" });
  if (guard.response) return guard.response;

  const { id } = await context.params;
  const item = await loadClassForActor(id, guard.actor);
  if (!item) return apiError(404, "CLASS_NOT_FOUND", "Class not found.");

  const now = appNow();
  return json({
    class: { ...item, status: getClassStatus(item, now) },
    join: getJoinState(item, now, getClassPolicy()),
  });
}
