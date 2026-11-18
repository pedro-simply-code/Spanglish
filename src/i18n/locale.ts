import { cookies, headers } from "next/headers";
import {
  LOCALE_COOKIE,
  isAppLocale,
  localeFromAcceptLanguage,
  type AppLocale,
} from "@/i18n/config";

async function localeFromSignedInProfile(): Promise<AppLocale | null> {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return null;
  }
  try {
    const { getSession } = await import("@/server/auth/session");
    const session = await getSession();
    if (session?.locale === "es" || session?.locale === "en") {
      return session.locale;
    }
  } catch {
    // Auth may be unavailable during CI/build without production secrets.
  }
  return null;
}

/**
 * Language for this request: signed-in profile locale, then the cookie (profile
 * / language menu), then Accept-Language. Dashboard client UI uses the same
 * profile locale via `<LocaleProvider>`; server `getTranslations()` must match.
 */
export async function getRequestLocale(): Promise<AppLocale> {
  const fromProfile = await localeFromSignedInProfile();
  if (fromProfile) return fromProfile;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isAppLocale(fromCookie)) return fromCookie;

  const headerStore = await headers();
  return localeFromAcceptLanguage(headerStore.get("accept-language"));
}

/** Server Actions / route handlers only (not during RSC render). */
export async function setLocaleCookie(locale: AppLocale) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
