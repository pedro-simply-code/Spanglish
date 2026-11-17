"use server";

import { env } from "@/env";
import { getActor } from "@/server/auth/session";
import { calendarRoleOf, loadCalendarData, resetCalendarFeed } from "@/server/calendar/events";

/* Only these two functions are server actions; they always use the signed-in actor. */

export async function loadCalendarAction(input: { from: string; to: string; teacherId?: string }) {
  const actor = await getActor();
  return loadCalendarData(actor, input);
}

/** Creates or resets the private .ics link; the URL is shown once. */
export async function resetCalendarFeedAction(): Promise<{ ok: boolean; url?: string; message: string }> {
  const actor = await getActor();
  if (!calendarRoleOf(actor)) return { ok: false, message: "The admin dashboard has no calendar." };
  const token = await resetCalendarFeed(actor.userId);
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return { ok: true, url: `${base}/api/calendar/${token}.ics`, message: "New private link created." };
}
