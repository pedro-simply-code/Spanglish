import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import {
  classRoomHref,
  formatClassDateTime,
  formatClassTime,
  formatClassTimeRange,
  getClassStatus,
  getJoinState,
} from "@/features/classes";
import type { ManagerClassroomRow } from "@/features/management";
import { isAppLocale, type AppLocale } from "@/i18n/config";
import { classTypeLabel } from "@/lib/class-type-label";
import { appNow, appNowDate } from "@/lib/app-clock";
import { classTimeZone } from "@/lib/class-policy";
import { addLocalDays, zonedParts, zonedTimeToUtc } from "@/lib/timezone";
import { env } from "@/env";
import { isClassBroadcastLiveSync } from "@/server/classes/broadcast-live";
import { getActiveLiveSessionClassIds } from "@/server/classes/class-live-session";
import { getClassPolicy } from "@/server/classes/class-policy";
import { listClassesOverlapping } from "@/server/classes/class-repository";
import { getMeetingProviderLabel } from "@/server/classes/meeting";

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function academyDayKey(from: Date): string {
  const parts = zonedParts(from, classTimeZone);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

export function parseAcademyDayKey(raw?: string): string | null {
  const value = raw?.trim();
  if (!value || !DAY_KEY.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return value;
}

function dayBoundsUtc(dayKey: string): { from: Date; to: Date } {
  const [yearRaw, monthRaw, dayRaw] = dayKey.split("-").map(Number);
  const year = yearRaw!;
  const month = monthRaw!;
  const day = dayRaw!;
  const from = zonedTimeToUtc({ year, month, day, minuteOfDay: 0 }, classTimeZone);
  const next = addLocalDays({ year, month, day }, 1);
  const to = zonedTimeToUtc({ ...next, minuteOfDay: 0 }, classTimeZone);
  return { from, to };
}

/** All classes on an academy calendar day (America/New_York), with roster and live flags. */
export async function listManagerClassroomsForDay(dayKey: string): Promise<ManagerClassroomRow[]> {
  await connection();
  const [studentT, classroomT, rawLocale] = await Promise.all([
    getTranslations("student"),
    getTranslations("classroom"),
    getLocale(),
  ]);
  const locale: AppLocale = isAppLocale(rawLocale) ? rawLocale : "en";
  const bounds = dayBoundsUtc(dayKey);
  const policy = getClassPolicy();
  const classes = await listClassesOverlapping({ ...bounds, limit: 200 });
  const provider = getMeetingProviderLabel((key) => classroomT(key as "meeting.customProvider"));
  const nowIso = appNow();
  const teacherStartsRequired = env.CLASS_TEACHER_STARTS_SESSION;
  const activeLiveIds = teacherStartsRequired
    ? await getActiveLiveSessionClassIds(classes.map((item) => item.id))
    : new Set<string>();

  const rows: ManagerClassroomRow[] = [];

  for (const item of classes) {
    const sessionStatus = getClassStatus(item, nowIso);
    const join = getJoinState(item, nowIso, policy, studentT);
    const teacherSessionActive = activeLiveIds.has(item.id);
    const isLive = isClassBroadcastLiveSync(sessionStatus, teacherStartsRequired, teacherSessionActive);
    rows.push({
      id: item.id,
      topic: item.topic,
      classType: item.type,
      classTypeLabel: classTypeLabel(item.type, studentT),
      startsAt: item.startsAt,
      timeLabel: formatClassTime(item.startsAt, locale),
      scheduleLabel: formatClassDateTime(item.startsAt, locale, studentT),
      timeRangeLabel: formatClassTimeRange(item, locale),
      durationMinutes: item.duration,
      teacherName: item.teacherName,
      students: (item.participants ?? []).map((participant) => ({
        name: participant.name,
        joined: participant.joined,
      })),
      sessionStatus,
      teacherStartsRequired,
      teacherSessionActive,
      isLive,
      canEnter: join.canJoin,
      joinMessage: join.message,
      provider,
      roomHref: classRoomHref(item.id),
      meetingRoom: item.meetingRoom,
      description: item.description,
      agenda: item.agenda,
      outcomes: item.outcomes,
    });
  }

  rows.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  return rows;
}

/** @deprecated Use {@link listManagerClassroomsForDay} with today's academy day key. */
export async function listManagerAcademyRooms(): Promise<ManagerClassroomRow[]> {
  return listManagerClassroomsForDay(academyDayKey(appNowDate()));
}