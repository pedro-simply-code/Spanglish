"use client";

import { useTranslations } from "next-intl";

/** Translated loading state for the public marketing routes. */
export function MarketingLoading({ minHeight }: { minHeight: string }) {
  const t = useTranslations("marketing");

  return (
    <div
      className={`flex items-center justify-center bg-[var(--background)] text-[var(--muted)] ${minHeight}`}
      aria-busy
    >
      {t("common.loading")}
    </div>
  );
}
