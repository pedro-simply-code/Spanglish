"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { completeOnboardingAction } from "@/features/auth/actions";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthButton } from "@/features/auth/components/auth-button";
import { AuthField } from "@/features/auth/components/auth-field";
import {
  LearningFields,
  LocaleSelect,
  TimezoneSelect,
  detectTimeZone,
  fieldClass,
  labelClass,
} from "@/features/auth/components/profile-fields";
import { useErrorText } from "@/features/auth/components/use-error-text";
import { nameErrorCode } from "@/lib/auth-validation";
import type {
  learningLanguages,
  learningLevels,
  profileLocales,
} from "@/lib/profile-schema";

type Locale = (typeof profileLocales)[number];
type LearningLanguage = (typeof learningLanguages)[number];
type Level = (typeof learningLevels)[number];

/** First-login profile: required before the dashboards open. */
export function OnboardingForm({ initialName }: { initialName: string }) {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const currentLocale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [locale, setLocale] = useState<Locale>(currentLocale === "es" ? "es" : "en");
  const [timezone, setTimezone] = useState(detectTimeZone);
  const [learningLanguage, setLearningLanguage] = useState<LearningLanguage>("spanish");
  const [level, setLevel] = useState<Level>("beginner");
  const [goal, setGoal] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const termsId = "accept-terms";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validation = nameErrorCode(name) ?? (!acceptTerms ? "TERMS_REQUIRED" : null);
    if (validation) {
      setError(errorText(validation));
      return;
    }

    startTransition(async () => {
      const result = await completeOnboardingAction({
        name,
        locale,
        timezone,
        learningLanguage,
        level,
        goal,
        acceptTerms: true,
      });

      if (!result.ok) {
        setError(errorText(result.code ?? "SAVE_FAILED"));
        return;
      }

      router.push(result.redirectTo ?? "/dashboard");
      router.refresh();
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <AuthField
        id="name"
        label={t("name")}
        placeholder={t("namePlaceholder")}
        autoComplete="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        disabled={pending}
        hint={t("nameHint")}
      />

      <LocaleSelect value={locale} onChange={setLocale} disabled={pending} />
      <TimezoneSelect value={timezone} onChange={setTimezone} disabled={pending} />
      <LearningFields
        learningLanguage={learningLanguage}
        level={level}
        onLearningLanguageChange={setLearningLanguage}
        onLevelChange={setLevel}
        disabled={pending}
      />

      <div className="space-y-2">
        <label htmlFor="goal" className={labelClass}>
          {t("goal")}{" "}
          <span className="font-normal text-[#7c8fac]">({tc("optional")})</span>
        </label>
        <textarea
          id="goal"
          className={`${fieldClass} min-h-20`}
          placeholder={t("goalPlaceholder")}
          value={goal}
          maxLength={500}
          onChange={(event) => setGoal(event.target.value)}
          disabled={pending}
        />
      </div>

      <label htmlFor={termsId} className="flex items-start gap-2 text-sm text-[#5a6a85]">
        <input
          id={termsId}
          type="checkbox"
          className="mt-1"
          checked={acceptTerms}
          onChange={(event) => setAcceptTerms(event.target.checked)}
          disabled={pending}
        />
        <span>{t("terms")}</span>
      </label>

      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
      <AuthButton loading={pending}>{t("submit")}</AuthButton>
    </form>
  );
}
