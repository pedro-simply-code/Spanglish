"use client";

import { useTranslations } from "next-intl";

export function AuthDivider({ label }: { label?: string }) {
  const t = useTranslations("common");
  const text = label ?? t("or");
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={text}>
      <span className="h-px flex-1 bg-[#e5eaef]" />
      <span className="text-xs font-medium uppercase tracking-wide text-[#7c8fac]">
        {text}
      </span>
      <span className="h-px flex-1 bg-[#e5eaef]" />
    </div>
  );
}
