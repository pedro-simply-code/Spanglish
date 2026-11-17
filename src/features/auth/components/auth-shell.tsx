"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SpanglishLogo } from "@/components/brand/spanglish-logo";
import { LanguageSwitch } from "@/features/auth/components/language-switch";

type ShellKey = "login" | "register" | "recover" | "twoFactor" | "onboarding";
type FooterKey = "toRegister" | "toLogin" | "remembered";

type AuthShellProps = {
  screen: ShellKey;
  footer?: FooterKey;
  children: React.ReactNode;
};

const footerKeys: Record<FooterKey, { lead: string; link: string; href: string }> = {
  toRegister: { lead: "noAccount", link: "createOne", href: "/register" },
  toLogin: { lead: "haveAccount", link: "signIn", href: "/login" },
  remembered: { lead: "remembered", link: "backToSignIn", href: "/login" },
};

/** Card layout of the auth screens, with the title, footer link and language switch. */
export function AuthShell({ screen, footer, children }: AuthShellProps) {
  const t = useTranslations("authShell");
  const footerCopy = footer ? footerKeys[footer] : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-10 flex justify-center">
        <SpanglishLogo href="/" size="lg" />
      </div>
      <div className="w-full max-w-md rounded-xl bg-surface p-8 shadow-modern">
        <header className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-[#2a3547]">{t(`${screen}.title`)}</h1>
          <p className="text-sm text-[#5a6a85]">{t(`${screen}.description`)}</p>
        </header>
        {children}
        {footerCopy ? (
          <footer className="mt-8 border-t border-[#e5eaef] pt-6 text-center text-sm text-[#5a6a85]">
            {t(`footer.${footerCopy.lead}`)}{" "}
            <Link
              href={footerCopy.href}
              className="font-semibold text-primary hover:text-primary-hover"
            >
              {t(`footer.${footerCopy.link}`)}
            </Link>
          </footer>
        ) : null}
      </div>
      <div className="mt-6">
        <LanguageSwitch />
      </div>
    </div>
  );
}
