"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/features/auth/auth-client";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthButton } from "@/features/auth/components/auth-button";
import { AuthDivider } from "@/features/auth/components/auth-divider";
import { AuthField } from "@/features/auth/components/auth-field";
import { EmailCodeForm } from "@/features/auth/components/email-code-form";
import { GoogleButton } from "@/features/auth/components/google-button";
import { MethodTabs, type AuthMethodTab } from "@/features/auth/components/method-tabs";
import { useCaptcha } from "@/features/auth/components/use-captcha";
import { useErrorText } from "@/features/auth/components/use-error-text";
import { VerifyEmailStep } from "@/features/auth/components/verify-email-step";
import {
  authDemo,
  emailErrorCode,
  passwordErrorCode,
} from "@/lib/auth-validation";

type RegisterFormProps = {
  googleEnabled: boolean;
  codeTtlMinutes: number;
};

/**
 * Sign-up with the same three methods as sign-in. Only the email (and a
 * password, for that method) is asked here; name, language, time zone,
 * learning goal and the terms are collected on /onboarding.
 */
export function RegisterForm({ googleEnabled, codeTtlMinutes }: RegisterFormProps) {
  const t = useTranslations();
  const errorText = useErrorText();
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<AuthMethodTab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { captchaHeaders, captchaReady, resetCaptcha, captchaWidget } = useCaptcha();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validation =
      emailErrorCode(email) ??
      passwordErrorCode(password) ??
      (password !== confirmPassword ? "PASSWORDS_DONT_MATCH" : null) ??
      (!captchaReady ? "CAPTCHA_REQUIRED" : null);
    if (validation) {
      setError(errorText(validation));
      return;
    }

    startTransition(async () => {
      const { error: signUpError } = await authClient.signUp.email({
        email: email.trim(),
        password,
        // Asked on onboarding.
        name: "",
        fetchOptions: { headers: captchaHeaders() },
      });
      resetCaptcha();

      if (signUpError) {
        setError(errorText(signUpError));
        return;
      }

      // Same screen whether or not the email already had an account.
      setVerifying(true);
    });
  };

  if (verifying) {
    return (
      <VerifyEmailStep
        email={email.trim()}
        intro={t("register.verifyIntro", { email: email.trim() })}
        codeTtlMinutes={codeTtlMinutes}
        onBack={() => setVerifying(false)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {googleEnabled ? (
        <>
          <GoogleButton />
          <AuthDivider />
        </>
      ) : null}

      <MethodTabs
        value={method}
        onChange={(next) => {
          setMethod(next);
          setError(null);
        }}
      />

      {method === "password" ? (
        <form
          className="space-y-5"
          aria-label={t("methods.password")}
          onSubmit={handleSubmit}
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
          <AuthField
            id="password"
            label={t("common.password")}
            type="password"
            placeholder={t("register.passwordPlaceholder")}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
            hint={t("register.passwordHint", { min: authDemo.minPasswordLength })}
          />
          <AuthField
            id="confirm-password"
            label={t("register.confirm")}
            type="password"
            placeholder={t("register.confirmPlaceholder")}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={pending}
          />
          {captchaWidget}
          {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
          <AuthButton loading={pending}>{t("register.submit")}</AuthButton>
          <p className="text-center text-xs text-[#7c8fac]">{t("register.verifyNote")}</p>
        </form>
      ) : (
        <EmailCodeForm
          email={email}
          onEmailChange={setEmail}
          codeTtlMinutes={codeTtlMinutes}
        />
      )}
    </div>
  );
}
