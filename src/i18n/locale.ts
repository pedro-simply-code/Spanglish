import { cookies, headers } from "next/headers";
import {
  LOCALE_COOKIE,
  isAppLocale,
  localeFromAcceptLanguage,
  type AppLocale,
} from "@/i18n/config";

/**
 * Language for this request: the cookie (set from the profile and the
 * language menu), else the browser's Accept-Language. Signed-in pages pass
 * the profile's locale directly instead.
 */
export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isAppLocale(fromCookie)) return fromCookie;

  const headerStore = await headers();
  return localeFromAcceptLanguage(headerStore.get("accept-language"));
}

export async function setLocaleCookie(locale: AppLocale) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
