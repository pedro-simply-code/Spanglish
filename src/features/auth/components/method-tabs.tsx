"use client";

import { useTranslations } from "next-intl";

export type AuthMethodTab = "password" | "code";

/** Switch between email + password and email + code on the auth pages. */
export function MethodTabs({
  value,
  onChange,
}: {
  value: AuthMethodTab;
  onChange: (next: AuthMethodTab) => void;
}) {
  const t = useTranslations("methods");

  return (
    <div
      role="tablist"
      aria-label={t("label")}
      className="grid grid-cols-2 gap-1 rounded-lg bg-[#f2f6fa] p-1"
    >
      {(["password", "code"] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
            value === option
              ? "bg-surface text-primary shadow-modern-soft"
              : "text-[#5a6a85] hover:text-[#2a3547]"
          }`}
        >
          {t(option)}
        </button>
      ))}
    </div>
  );
}
