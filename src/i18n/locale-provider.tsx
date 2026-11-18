import { NextIntlClientProvider } from "next-intl";
import type { AppLocale } from "@/i18n/config";
import { HtmlLangSync } from "@/i18n/html-lang-sync";
import { getRequestLocale } from "@/i18n/locale";
import { getMessages } from "@/i18n/messages";

/**
 * Provides translations to client components. Pass `locale` when it is known
 * (signed-in pages use the profile); otherwise it comes from the cookie or
 * the browser. Must render inside a `<Suspense>` boundary when it reads the
 * request (Cache Components).
 */
export async function LocaleProvider({
  locale,
  children,
}: {
  locale?: AppLocale;
  children: React.ReactNode;
}) {
  const resolved = locale ?? (await getRequestLocale());
  return (
    <NextIntlClientProvider
      locale={resolved}
      messages={getMessages(resolved)}
      timeZone="UTC"
    >
      <HtmlLangSync />
      {children}
    </NextIntlClientProvider>
  );
}
