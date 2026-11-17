import type { AppLocale } from "@/i18n/config";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";

export type Messages = typeof en;

const catalogs: Record<AppLocale, Messages> = { en, es };

export function getMessages(locale: AppLocale): Messages {
  return catalogs[locale];
}
