import { classTypeLabel } from "@/lib/class-type-label";
import { classTimeZone } from "@/lib/class-policy";
import type { LiveClass } from "@/features/classes/types";

const dateLongFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: classTimeZone,
});

const dateShortFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: classTimeZone,
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: classTimeZone,
});

function getPart(iso: string, type: Intl.DateTimeFormatPartTypes) {
  return dateLongFormatter
    .formatToParts(new Date(iso))
    .find((part) => part.type === type)?.value;
}

export function formatClassDate(iso: string) {
  return dateLongFormatter.format(new Date(iso));
}

export function formatClassDateShort(iso: string) {
  return dateShortFormatter.format(new Date(iso));
}

export function formatClassTime(iso: string) {
  return timeFormatter.format(new Date(iso));
}

export function formatClassDateTime(iso: string) {
  return `${formatClassDateShort(iso)} at ${formatClassTime(iso)}`;
}

export function formatClassTimeRange(item: LiveClass) {
  const start = new Date(item.startsAt).getTime();
  const end = new Date(start + item.duration * 60_000).toISOString();
  return `${formatClassTime(item.startsAt)} – ${formatClassTime(end)}`;
}

export function getClassDateParts(iso: string) {
  return {
    weekday: getPart(iso, "weekday")?.slice(0, 3) ?? "",
    day: getPart(iso, "day") ?? "",
    month: getPart(iso, "month")?.slice(0, 3) ?? "",
    year: getPart(iso, "year") ?? "",
  };
}

export function formatRelativeStart(item: LiveClass, nowIso: string) {
  const now = new Date(nowIso).getTime();
  const start = new Date(item.startsAt).getTime();
  const end = start + item.duration * 60_000;
  const diff = start - now;

  if (diff > 0) {
    const totalMinutes = Math.round(diff / 60_000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `Starts in ${days} ${days === 1 ? "day" : "days"}${
        hours > 0 ? ` ${hours} h` : ""
      }`;
    }

    if (hours > 0) {
      return `Starts in ${hours} h ${minutes} min`;
    }

    return `Starts in ${Math.max(minutes, 1)} min`;
  }

  if (now < end) {
    return "In progress";
  }

  return "Finished";
}

export function formatDuration(minutes: number) {
  return `${minutes} min`;
}

export function formatClassType(type: LiveClass["type"]) {
  return classTypeLabel(type);
}
