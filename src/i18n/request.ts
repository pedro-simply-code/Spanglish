import { getRequestConfig } from "next-intl/server";
import { getRequestLocale } from "@/i18n/locale";
import { getMessages } from "@/i18n/messages";

/**
 * next-intl request config, used by server components that call
 * `getTranslations()`. Most screens get their messages from
 * `<LocaleProvider>` instead (see src/i18n/locale-provider.tsx).
 */
export default getRequestConfig(async () => {
  const locale = await getRequestLocale();
  return { locale, messages: getMessages(locale) };
});
