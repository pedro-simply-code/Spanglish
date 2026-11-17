import { env } from "@/env";
import type { ClassPolicy } from "@/lib/class-policy";

/**
 * Class policy as configured by the server environment.
 *
 * Only the environment read lives here. Policy decisions stay pure so both the
 * server actions and the UI can evaluate the same rules. The server action is
 * still the authority and re-checks every cancel or reschedule request.
 */
export function getClassPolicy(): ClassPolicy {
  return {
    cancelCutoffHours: env.CLASS_CANCEL_CUTOFF_HOURS,
    rescheduleCutoffHours: env.CLASS_RESCHEDULE_CUTOFF_HOURS,
    joinWindowBeforeMinutes: env.CLASS_JOIN_WINDOW_BEFORE_MINUTES,
    joinWindowAfterMinutes: env.CLASS_JOIN_WINDOW_AFTER_MINUTES,
    meetingTokenTtlMinutes: env.MEETING_TOKEN_TTL_MINUTES,
    relaxJoinWindow: env.CLASS_RELAX_JOIN_WINDOW,
  };
}
