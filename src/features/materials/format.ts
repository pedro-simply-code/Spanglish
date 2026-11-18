type Translator = (key: string) => string;

/** Locale tag used when a caller does not provide one. */
const fallbackLocale = "en-US";

export function formatMaterialDate(iso: string, locale: string = fallbackLocale) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(iso));
}

export function formatMaterialDateTime(iso: string, locale: string = fallbackLocale) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(iso));
}

/**
 * Localized kind label. Pass a translator scoped to `educator.materials`
 * (keys under `kind.*`).
 */
export function formatMaterialKind(kind: string, t?: Translator) {
  const known = [
    "document",
    "link",
    "video",
    "audio",
    "form",
    "recording",
  ] as const;
  if (t && known.includes(kind as (typeof known)[number])) {
    return t(`kind.${kind}`);
  }
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

/**
 * Localized level label. Pass a translator scoped to `educator.materials`
 * (keys under `level.*`).
 */
export function formatMaterialLevel(level: string, t?: Translator) {
  const keys: Record<string, string> = {
    "All levels": "all",
    all: "all",
    Beginner: "beginner",
    beginner: "beginner",
    Intermediate: "intermediate",
    intermediate: "intermediate",
    Advanced: "advanced",
    advanced: "advanced",
  };
  const key = keys[level];
  return key && t ? t(`level.${key}`) : level;
}
