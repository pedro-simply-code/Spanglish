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
import {
  authDemo,
  codeErrorCode,
  emailErrorCode,
  passwordErrorCode,
} from "@/lib/auth-validation";

/**
 * Password reset with an emailed code (works the same on web and in the
 * Android app). A successful reset signs out every other device.
 */
export function RecoverPasswordForm({ codeTtlMinutes }: { codeTtlMinutes: number }) {
  const t = useTranslations();
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { captchaHeaders, captchaReady, resetCaptcha, captchaWidget } = useCaptcha();

  const requestCode = () => {
    setError(null);
    const validation = emailErrorCode(email) ?? (!captchaReady ? "CAPTCHA_REQUIRED" : null);
    if (validation) {
      setError(errorText(validation));
      return;
    }

    startTransition(async () => {
      const { error: requestError } = await authClient.emailOtp.requestPasswordReset({
        email: email.trim(),
        fetchOptions: { headers: captchaHeaders() },
      });
      resetCaptcha();
      if (requestError) {
        setError(errorText(requestError));
        return;
      }
      setStep("reset");
      setNotice(t("recover.notice", { email: email.trim() }));
    });
  };

  const resetPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validation =
      codeErrorCode(code) ??
      passwordErrorCode(password) ??
      (password !== confirmPassword ? "PASSWORDS_DONT_MATCH" : null);
    if (validation) {
      setError(errorText(validation));
      return;
    }

    startTransition(async () => {
      const { error: resetError } = await authClient.emailOtp.resetPassword({
        email: email.trim(),
        otp: code.trim(),
        password,
      });
      if (resetError) {
        setError(errorText(resetError.code ? resetError : "INVALID_OTP"));
        return;
      }
      router.push("/login?reset=1");
    });
  };

  if (step === "email") {
    return (
      <form
        className="space-y-5"
        aria-label={t("recover.send")}
        onSubmit={(event) => {
          event.preventDefault();
          requestCode();
        }}
        noValidate
      >
        <AuthField
          id="email"
          label={t("common.email")}
          type="email"
          placeholder={t("common.emailPlaceholder")}
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
          inputMode="email"
        />
        {captchaWidget}
        {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
        <AuthButton loading={pending}>{t("recover.send")}</AuthButton>
      </form>
    );
  }

  return (
    <form
      className="space-y-5"
      aria-label={t("recover.submit")}
      onSubmit={resetPassword}
      noValidate
    >
      <AuthField
        id="reset-code"
        label={t("recover.codeLabel")}
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
      <AuthField
        id="new-password"
        label={t("recover.newPassword")}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={pending}
        hint={t("register.passwordHint", { min: authDemo.minPasswordLength })}
      />
      <AuthField
        id="confirm-new-password"
        label={t("recover.confirm")}
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        disabled={pending}
      />
      {notice && !error ? <AuthAlert tone="success">{notice}</AuthAlert> : null}
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
      <AuthButton loading={pending}>{t("recover.submit")}</AuthButton>
      <AuthButton
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setStep("email");
          setError(null);
        }}
      >
        {t("recover.otherEmail")}
      </AuthButton>
    </form>
  );
}
