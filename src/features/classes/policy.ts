import type { ClassPolicy } from "@/lib/class-policy";
import { demoNow } from "@/lib/demo-clock";
import { formatClassDateTime } from "@/features/classes/format";
import type {
  ClassChangeAction,
  ClassChangeDecision,
  JoinState,
  LiveClass,
  LiveClassStatus,
} from "@/features/classes/types";

export type { ClassPolicy } from "@/lib/class-policy";

/**
 * Safe defaults used when a policy value is not provided. The server wrapper
 * in `src/server/classes/class-policy.ts` reads the real values from env.
 */
export const defaultClassPolicy: ClassPolicy = {
  cancelCutoffHours: 24,
  rescheduleCutoffHours: 24,
  joinWindowBeforeMinutes: 15,
  joinWindowAfterMinutes: 15,
  meetingTokenTtlMinutes: 60,
  relaxJoinWindow: false,
};

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

export function getClassStart(item: LiveClass) {
  return new Date(item.startsAt).getTime();
}

export function getClassEnd(item: LiveClass) {
  return getClassStart(item) + item.duration * MINUTE_MS;
}

export function getHoursUntilStart(item: LiveClass, nowIso: string) {
  return (getClassStart(item) - new Date(nowIso).getTime()) / HOUR_MS;
}

export function getClassStatus(
  item: LiveClass,
  nowIso: string = demoNow,
): LiveClassStatus {
  if (item.statusOverride === "canceled") {
    return "canceled";
  }

  const now = new Date(nowIso).getTime();

  if (now >= getClassEnd(item)) {
    return "completed";
  }

  if (now >= getClassStart(item)) {
    return "in-progress";
  }

  return "upcoming";
}

export function getChangeCutoffHours(
  action: ClassChangeAction,
  policy: ClassPolicy,
) {
  return action === "cancel"
    ? policy.cancelCutoffHours
    : policy.rescheduleCutoffHours;
}

export function decideClassChange(
  item: LiveClass,
  action: ClassChangeAction,
  nowIso: string,
  policy: ClassPolicy = defaultClassPolicy,
): ClassChangeDecision {
  const cutoffHours = getChangeCutoffHours(action, policy);
  const hoursUntilStart = getHoursUntilStart(item, nowIso);
  const cutoffAt = new Date(
    getClassStart(item) - cutoffHours * HOUR_MS,
  ).toISOString();
  const status = getClassStatus(item, nowIso);

  const denied = (message: string): ClassChangeDecision => ({
    allowed: false,
    cutoffHours,
    hoursUntilStart,
    cutoffAt,
    message,
  });

  if (status === "canceled") {
    return denied("This class was already canceled.");
  }

  if (status === "completed") {
    return denied("Completed classes cannot be changed.");
  }

  if (status === "in-progress") {
    return denied("Classes that are already in progress cannot be changed.");
  }

  if (hoursUntilStart < cutoffHours) {
    return denied(
      `Changes must be requested at least ${cutoffHours} hours before the class starts.`,
    );
  }

  return {
    allowed: true,
    cutoffHours,
    hoursUntilStart,
    cutoffAt,
    message:
      action === "cancel"
        ? `Free cancellation until ${formatClassDateTime(cutoffAt)}.`
        : `Free rescheduling until ${formatClassDateTime(cutoffAt)}.`,
  };
}

export function getJoinWindow(item: LiveClass, policy: ClassPolicy) {
  const start = getClassStart(item);
  return {
    opensAt: new Date(
      start - policy.joinWindowBeforeMinutes * MINUTE_MS,
    ).toISOString(),
    closesAt: new Date(
      start + policy.joinWindowAfterMinutes * MINUTE_MS,
    ).toISOString(),
  };
}

export function getJoinState(
  item: LiveClass,
  nowIso: string,
  policy: ClassPolicy = defaultClassPolicy,
): JoinState {
  const status = getClassStatus(item, nowIso);
  const { opensAt, closesAt } = getJoinWindow(item, policy);
  const now = new Date(nowIso).getTime();

  const unavailable = (message: string): JoinState => ({
    status: "unavailable",
    canJoin: false,
    opensAt,
    closesAt,
    message,
  });

  if (status === "canceled") {
    return unavailable("This class was canceled, so the room is closed.");
  }

  if (status === "completed") {
    return unavailable("This class has finished. Watch the recording instead.");
  }

  if (!policy.relaxJoinWindow && now < new Date(opensAt).getTime()) {
    return {
      status: "too-early",
      canJoin: false,
      opensAt,
      closesAt,
      message: `The classroom opens ${policy.joinWindowBeforeMinutes} minutes before the class starts.`,
    };
  }

  if (
    policy.relaxJoinWindow &&
    status === "upcoming" &&
    now < new Date(opensAt).getTime()
  ) {
    return {
      status: "open",
      canJoin: true,
      opensAt,
      closesAt,
      message:
        "Join window relaxed for testing. The room is open before the usual pre-start window.",
    };
  }

  if (now > new Date(closesAt).getTime()) {
    return {
      status: "closed",
      canJoin: false,
      opensAt,
      closesAt,
      message: `The join window closed ${policy.joinWindowAfterMinutes} minutes after the class started.`,
    };
  }

  return {
    status: "open",
    canJoin: true,
    opensAt,
    closesAt,
    message: "The classroom is open. Your teacher is waiting.",
  };
}

export function getUpcomingClasses(items: LiveClass[], nowIso: string) {
  return items
    .filter((item) => getClassStatus(item, nowIso) === "upcoming")
    .sort((a, b) => getClassStart(a) - getClassStart(b));
}
