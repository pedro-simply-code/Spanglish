import type { ClassPolicy } from "@/lib/class-policy";
import { demoNow } from "@/lib/demo-clock";
import type { AppLocale } from "@/i18n/config";
import {
  formatClassDateTime,
  type StudentTranslator,
} from "@/features/classes/format";
import type {
  ClassChangeAction,
  ClassChangeDecision,
  JoinState,
  LiveClass,
  LiveClassStatus,
} from "@/features/classes/types";

export type { ClassPolicy } from "@/lib/class-policy";

/** Scoped student translator accepted by the class policy helpers. */
export type ClassPolicyTranslator = StudentTranslator;

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

const englishPolicyMessages = {
  "policy.alreadyCanceled": "This class was already canceled.",
  "policy.completedCannotChange": "Completed classes cannot be changed.",
  "policy.inProgressCannotChange": "Classes that are already in progress cannot be changed.",
  "policy.changeCutoff":
    "Changes must be requested at least {hours} hours before the class starts.",
  "policy.freeCancellation": "Free cancellation until {date}.",
  "policy.freeRescheduling": "Free rescheduling until {date}.",
  "policy.joinCanceled": "This class was canceled, so the room is closed.",
  "policy.joinCompleted": "This class has finished. Watch the recording instead.",
  "policy.joinTooEarly": "The classroom opens {minutes} minutes before the class starts.",
  "policy.joinRelaxed":
    "Join window relaxed for testing. The room is open before the usual pre-start window.",
  "policy.joinClosed": "The join window closed {minutes} minutes after the class started.",
  "policy.joinOpen": "The classroom is open. If your teacher hasn't started the class yet, you'll wait there until they do.",
} as const;

type PolicyMessageKey = keyof typeof englishPolicyMessages;

function interpolate(
  message: string,
  values?: Record<string, string | number>,
) {
  if (!values) return message;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    message,
  );
}

/** Keeps unowned callers compiling with the original English messages. */
const englishPolicyTranslator = ((
  key: PolicyMessageKey,
  values?: Record<string, string | number>,
) => interpolate(englishPolicyMessages[key] ?? key, values)) as ClassPolicyTranslator;

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
  t: ClassPolicyTranslator = englishPolicyTranslator,
  locale: AppLocale = "en",
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
    return denied(t("policy.alreadyCanceled"));
  }

  if (status === "completed") {
    return denied(t("policy.completedCannotChange"));
  }

  if (status === "in-progress") {
    return denied(t("policy.inProgressCannotChange"));
  }

  if (hoursUntilStart < cutoffHours) {
    return denied(
      t("policy.changeCutoff", { hours: cutoffHours }),
    );
  }

  const date = formatClassDateTime(cutoffAt, locale, t);
  return {
    allowed: true,
    cutoffHours,
    hoursUntilStart,
    cutoffAt,
    message:
      action === "cancel"
        ? t("policy.freeCancellation", { date })
        : t("policy.freeRescheduling", { date }),
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
  t: ClassPolicyTranslator = englishPolicyTranslator,
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
    return unavailable(t("policy.joinCanceled"));
  }

  if (status === "completed") {
    return unavailable(t("policy.joinCompleted"));
  }

  if (!policy.relaxJoinWindow && now < new Date(opensAt).getTime()) {
    return {
      status: "too-early",
      canJoin: false,
      opensAt,
      closesAt,
      message: t("policy.joinTooEarly", {
        minutes: policy.joinWindowBeforeMinutes,
      }),
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
      message: t("policy.joinRelaxed"),
    };
  }

  if (now > new Date(closesAt).getTime()) {
    return {
      status: "closed",
      canJoin: false,
      opensAt,
      closesAt,
      message: t("policy.joinClosed", {
        minutes: policy.joinWindowAfterMinutes,
      }),
    };
  }

  return {
    status: "open",
    canJoin: true,
    opensAt,
    closesAt,
    message: t("policy.joinOpen"),
  };
}

export function getUpcomingClasses(items: LiveClass[], nowIso: string) {
  return items
    .filter((item) => getClassStatus(item, nowIso) === "upcoming")
    .sort((a, b) => getClassStart(a) - getClassStart(b));
}
