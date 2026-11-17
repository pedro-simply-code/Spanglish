"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "@/features/auth/auth-client";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthButton } from "@/features/auth/components/auth-button";
import { AuthField } from "@/features/auth/components/auth-field";
import { useCaptcha } from "@/features/auth/components/use-captcha";
import { useErrorText } from "@/features/auth/components/use-error-text";
import { codeErrorCode } from "@/lib/auth-validation";

type VerifyEmailStepProps = {
  email: string;
  /** Shown above the code field (why a code was sent). */
  intro: string;
  codeTtlMinutes: number;
  onBack: () => void;
  redirectTo?: string;
};

/**
 * Mandatory email verification for email + password accounts. A valid code
 * verifies the address and signs the user in.
 */
export function VerifyEmailStep({
  email,
  intro,
  codeTtlMinutes,
  onBack,
  redirectTo = "/dashboard",
}: VerifyEmailStepProps) {
  const t = useTranslations();
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(intro);
  const { captchaHeaders, captchaReady, resetCaptcha, captchaWidget } = useCaptcha();

  const verify = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const codeError = codeErrorCode(code);
    if (codeError) {
      setError(errorText(codeError));
      return;
    }

    startTransition(async () => {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email,
        otp: code.trim(),
      });

      if (verifyError) {
        setError(errorText(verifyError.code ? verifyError : "INVALID_OTP"));
        return;
      }

      router.push(redirectTo);
      router.refresh();
    });
  };

  const resend = () => {
    setError(null);
    if (!captchaReady) {
      setError(errorText("CAPTCHA_REQUIRED"));
      return;
    }
    startTransition(async () => {
      const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
        fetchOptions: { headers: captchaHeaders() },
      });
      resetCaptcha();
      if (sendError) {
        setError(errorText(sendError));
        return;
      }
      setNotice(t("verifyEmail.resent", { email }));
    });
  };

  return (
    <form
      className="space-y-5"
      aria-label={t("verifyEmail.codeLabel")}
      onSubmit={verify}
      noValidate
    >
      <div className="flex items-center justify-between gap-2 rounded-lg bg-[#f2f6fa] px-3 py-2.5">
        <span className="truncate text-sm text-[#2a3547]">{email}</span>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-primary hover:text-primary-hover"
        >
          {t("common.change")}
        </button>
      </div>
      <AuthField
        id="verify-code"
        label={t("verifyEmail.codeLabel")}
        placeholder={t("common.codePlaceholder")}
        autoComplete="one-time-code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        disabled={pending}
        maxLength={6}
        inputMode="numeric"
        hint={t("common.codeExpires", { minutes: codeTtlMinutes })}
        autoFocus
      />
      {notice && !error ? <AuthAlert tone="success">{notice}</AuthAlert> : null}
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
      <AuthButton loading={pending}>{t("verifyEmail.submit")}</AuthButton>
      {captchaWidget}
      <AuthButton type="button" variant="secondary" disabled={pending} onClick={resend}>
        {t("common.resendCode")}
      </AuthButton>
    </form>
  );
}
