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
import { codeErrorCode, emailErrorCode } from "@/lib/auth-validation";

type EmailCodeFormProps = {
  email: string;
  onEmailChange: (email: string) => void;
  /** Minutes a code stays valid, shown as a hint. */
  codeTtlMinutes: number;
  /** Where to go after signing in (defaults to the active dashboard). */
  redirectTo?: string;
};

/**
 * Passwordless sign-in and sign-up: the code proves the inbox, and the
 * account is created on first use. The same flow serves /login and /register.
 */
export function EmailCodeForm({
  email,
  onEmailChange,
  codeTtlMinutes,
  redirectTo = "/dashboard",
}: EmailCodeFormProps) {
  const t = useTranslations();
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { captchaHeaders, captchaReady, resetCaptcha, captchaWidget } = useCaptcha();

  const sendCode = () => {
    setError(null);
    setNotice(null);

    const emailError = emailErrorCode(email);
    if (emailError) {
      setError(errorText(emailError));
      return;
    }

    if (!captchaReady) {
      setError(errorText("CAPTCHA_REQUIRED"));
      return;
    }

    startTransition(async () => {
      const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
        fetchOptions: { headers: captchaHeaders() },
      });
      resetCaptcha();

      if (sendError) {
        setError(errorText(sendError));
        return;
      }

      setCodeSent(true);
      setCode("");
      setNotice(t("emailCode.sent", { email: email.trim() }));
    });
  };

  const verifyCode = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const codeError = codeErrorCode(code);
    if (codeError) {
      setError(errorText(codeError));
      return;
    }

    startTransition(async () => {
      const { error: signInError } = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp: code.trim(),
      });

      if (signInError) {
        setError(errorText(signInError.code ? signInError : "INVALID_OTP"));
        return;
      }

      router.push(redirectTo);
      router.refresh();
    });
  };

  if (!codeSent) {
    return (
      <form
        className="space-y-5"
        aria-label={t("methods.code")}
        onSubmit={(event) => {
          event.preventDefault();
          sendCode();
        }}
        noValidate
      >
        <AuthField
          id="email-code"
          label={t("common.email")}
          type="email"
          placeholder={t("common.emailPlaceholder")}
          autoComplete="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          disabled={pending}
          inputMode="email"
          hint={t("emailCode.hint")}
        />
        {captchaWidget}
        {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
        <AuthButton loading={pending}>{t("emailCode.send")}</AuthButton>
      </form>
    );
  }

  return (
    <form
      className="space-y-5"
      aria-label={t("emailCode.codeLabel")}
      onSubmit={verifyCode}
      noValidate
    >
      <div className="flex items-center justify-between gap-2 rounded-lg bg-[#f2f6fa] px-3 py-2.5">
        <span className="truncate text-sm text-[#2a3547]">{email}</span>
        <button
          type="button"
          onClick={() => {
            setCodeSent(false);
            setError(null);
            setNotice(null);
          }}
          className="text-xs font-semibold text-primary hover:text-primary-hover"
        >
          {t("common.change")}
        </button>
      </div>
      <AuthField
        id="code"
        label={t("emailCode.codeLabel")}
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
      {captchaWidget}
      <AuthButton loading={pending}>{t("emailCode.submit")}</AuthButton>
      <AuthButton
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={sendCode}
      >
        {t("common.resendCode")}
      </AuthButton>
    </form>
  );
}
