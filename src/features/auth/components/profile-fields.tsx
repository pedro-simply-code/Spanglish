"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type {
  learningLanguages,
  learningLevels,
  profileLocales,
} from "@/lib/profile-schema";

type Locale = (typeof profileLocales)[number];
type LearningLanguage = (typeof learningLanguages)[number];
type Level = (typeof learningLevels)[number];

export const fieldClass =
  "block w-full rounded-lg border border-[#dfe5ef] bg-surface px-3 py-2.5 text-sm text-[#2a3547] shadow-modern-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-[#f2f6fa]";
export const labelClass = "block text-sm font-semibold text-[#2a3547]";

export function detectTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function listTimeZones(current: string) {
  try {
    const zones = Intl.supportedValuesOf("timeZone");
    return zones.includes(current) ? zones : [current, ...zones];
  } catch {
    return [current];
  }
}

/** App language picker (onboarding and Settings). */
export function LocaleSelect({
  value,
  onChange,
  disabled,
}: {
  value: Locale;
  onChange: (value: Locale) => void;
  disabled?: boolean;
}) {
  const t = useTranslations();
  return (
    <div className="space-y-2">
      <label htmlFor="locale" className={labelClass}>
        {t("onboarding.appLanguage")}
      </label>
      <select
        id="locale"
        className={fieldClass}
        value={value}
        onChange={(event) => onChange(event.target.value as Locale)}
        disabled={disabled}
      >
        <option value="en">{t("language.en")}</option>
        <option value="es">{t("language.es")}</option>
      </select>
    </div>
  );
}

/** Time zone picker with the device zone preselected. */
export function TimezoneSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("onboarding");
  const zones = useMemo(() => listTimeZones(value), [value]);
  return (
    <div className="space-y-2">
      <label htmlFor="timezone" className={labelClass}>
        {t("timezone")}
      </label>
      <select
        id="timezone"
        className={fieldClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <p className="text-xs text-[#7c8fac]">{t("timezoneHint")}</p>
    </div>
  );
}

/** What the student wants to learn and their level. */
export function LearningFields({
  learningLanguage,
  level,
  onLearningLanguageChange,
  onLevelChange,
  disabled,
}: {
  learningLanguage: LearningLanguage;
  level: Level;
  onLearningLanguageChange: (value: LearningLanguage) => void;
  onLevelChange: (value: Level) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("onboarding");
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <label htmlFor="learning-language" className={labelClass}>
          {t("learn")}
        </label>
        <select
          id="learning-language"
          className={fieldClass}
          value={learningLanguage}
          onChange={(event) =>
            onLearningLanguageChange(event.target.value as LearningLanguage)
          }
          disabled={disabled}
        >
          <option value="spanish">{t("learningLanguages.spanish")}</option>
          <option value="english">{t("learningLanguages.english")}</option>
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="level" className={labelClass}>
          {t("level")}
        </label>
        <select
          id="level"
          className={fieldClass}
          value={level}
          onChange={(event) => onLevelChange(event.target.value as Level)}
          disabled={disabled}
        >
          <option value="beginner">{t("levels.beginner")}</option>
          <option value="intermediate">{t("levels.intermediate")}</option>
          <option value="advanced">{t("levels.advanced")}</option>
        </select>
      </div>
    </div>
  );
}
