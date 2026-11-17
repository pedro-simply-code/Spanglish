import { getClassStatus, loadClassesForActor } from "@/features/classes";
import { appNow } from "@/lib/app-clock";
import { json, requireApiActor } from "@/server/api/http";

/** GET /api/v1/classes — the caller's classes with their current status. */
export async function GET() {
  const guard = await requireApiActor({ permission: "classes:view-own" });
  if (guard.response) return guard.response;

  const now = appNow();
  const classes = await loadClassesForActor(guard.actor);
  return json({
    classes: classes.map((item) => ({ ...item, status: getClassStatus(item, now) })),
  });
}
