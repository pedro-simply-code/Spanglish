"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocaleAction } from "@/features/auth/actions";

/** English / Español toggle. Saves a cookie, and the profile when signed in. */
export function LanguageSwitch() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (next: "en" | "es") => {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  };

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="flex items-center gap-1 text-xs font-semibold text-[#5a6a85]"
    >
      {(["en", "es"] as const).map((option) => (
        <button
          key={option}
          type="button"
          disabled={pending}
          onClick={() => choose(option)}
          aria-pressed={locale === option}
          className={`rounded-md px-2 py-1 ${
            locale === option ? "bg-surface text-primary shadow-modern-soft" : "hover:text-[#2a3547]"
          }`}
        >
          {t(option)}
        </button>
      ))}
    </div>
  );
}
