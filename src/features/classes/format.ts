import type { useTranslations } from "next-intl";
import { classTypeLabel } from "@/lib/class-type-label";
import type { AppLocale } from "@/i18n/config";
import { classTimeZone } from "@/lib/class-policy";
import type { LiveClass } from "@/features/classes/types";

/** Scoped student translator used by the class presentation helpers. */
export type StudentTranslator = ReturnType<typeof useTranslations<"student">>;

const MINUTE_MS = 60_000;

function dateTimeLocale(locale: AppLocale) {
  return locale === "es" ? "es-ES" : "en-US";
}

function longDateFormatter(locale: AppLocale) {
  return new Intl.DateTimeFormat(dateTimeLocale(locale), {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: classTimeZone,
  });
}

function shortDateFormatter(locale: AppLocale) {
  return new Intl.DateTimeFormat(dateTimeLocale(locale), {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: classTimeZone,
  });
}

function timeFormatter(locale: AppLocale) {
  return new Intl.DateTimeFormat(dateTimeLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: classTimeZone,
  });
}

function getPart(iso: string, type: Intl.DateTimeFormatPartTypes, locale: AppLocale) {
  return longDateFormatter(locale)
    .formatToParts(new Date(iso))
    .find((part) => part.type === type)?.value;
}

export function formatClassDate(iso: string, locale: AppLocale = "en") {
  return longDateFormatter(locale).format(new Date(iso));
}

export function formatClassDateShort(iso: string, locale: AppLocale = "en") {
  return shortDateFormatter(locale).format(new Date(iso));
}

export function formatClassTime(iso: string, locale: AppLocale = "en") {
  return timeFormatter(locale).format(new Date(iso));
}

export function formatClassDateTime(
  iso: string,
  locale: AppLocale = "en",
  t?: StudentTranslator,
) {
  const at = t ? t("format.at") : "at";
  return `${formatClassDateShort(iso, locale)} ${at} ${formatClassTime(iso, locale)}`;
}

export function formatClassTimeRange(item: LiveClass, locale: AppLocale = "en") {
  const start = new Date(item.startsAt).getTime();
  const end = new Date(start + item.duration * MINUTE_MS).toISOString();
  return `${formatClassTime(item.startsAt, locale)} – ${formatClassTime(end, locale)}`;
}

export function getClassDateParts(iso: string, locale: AppLocale = "en") {
  return {
    weekday: getPart(iso, "weekday", locale)?.slice(0, 3) ?? "",
    day: getPart(iso, "day", locale) ?? "",
    month: getPart(iso, "month", locale)?.slice(0, 3) ?? "",
    year: getPart(iso, "year", locale) ?? "",
  };
}

export function formatRelativeStart(
  item: LiveClass,
  nowIso: string,
  t?: StudentTranslator,
) {
  const now = new Date(nowIso).getTime();
  const start = new Date(item.startsAt).getTime();
  const end = start + item.duration * MINUTE_MS;
  const diff = start - now;

  if (diff > 0) {
    const totalMinutes = Math.round(diff / MINUTE_MS);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      const hoursSuffix = hours > 0 ? ` ${hours} h` : "";
      return t
        ? t("format.startsInDays", { count: days, hours: hoursSuffix })
        : `Starts in ${days} ${days === 1 ? "day" : "days"}${hoursSuffix}`;
    }

    if (hours > 0) {
      return t
        ? t("format.startsInHours", { hours, minutes })
        : `Starts in ${hours} h ${minutes} min`;
    }

    const count = Math.max(minutes, 1);
    return t
      ? t("format.startsInMinutes", { count })
      : `Starts in ${count} min`;
  }

  if (now < end) {
    return t ? t("format.inProgress") : "In progress";
  }

  return t ? t("format.finished") : "Finished";
}

export function formatDuration(minutes: number, t?: StudentTranslator) {
  return t ? t("common.minutes", { count: minutes }) : `${minutes} min`;
}

export function formatClassType(type: LiveClass["type"], t?: StudentTranslator) {
  return classTypeLabel(type, t);
}
