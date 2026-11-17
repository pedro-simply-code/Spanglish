import { env } from "@/env";
import { getPrimaryRole, normalizeRoles } from "@/lib/auth-roles";
import type { AuthSession } from "@/lib/auth-types";
import { buildIcs, listCalendarClasses, userForFeedToken } from "@/server/calendar/events";

/**
 * GET /api/calendar/<token>.ics — private calendar subscription for Google
 * Calendar, Outlook or Apple Calendar. The token comes from the Calendar page
 * ("Subscribe"); resetting it there turns this URL off.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await userForFeedToken(token.replace(/\.ics$/, ""));
  if (!user) return new Response("Not found", { status: 404 });

  const role = getPrimaryRole(normalizeRoles(user.roles ?? []));
  if (role === "admin") return new Response("Not found", { status: 404 });

  const now = Date.now();
  const actor = { userId: user.id, roles: [role], activeRole: role } as AuthSession;
  const classes = await listCalendarClasses(actor, role, {
    from: new Date(now - 30 * 86_400_000),
    to: new Date(now + 90 * 86_400_000),
  });
  const body = buildIcs({ name: user.name, classes, baseUrl: env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "") });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="spanglish.ics"',
      "Cache-Control": "private, max-age=900",
    },
  });
}
