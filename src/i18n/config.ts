/** Supported UI languages. English is the default. */
export const locales = ["en", "es"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";

/** Cookie with the chosen language (also read for emails before sign-up). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isAppLocale(value: unknown): value is AppLocale {
  return value === "en" || value === "es";
}

/** Best match from an Accept-Language header. */
export function localeFromAcceptLanguage(header: string | null | undefined): AppLocale {
  const first = header?.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("es") ? "es" : defaultLocale;
}
