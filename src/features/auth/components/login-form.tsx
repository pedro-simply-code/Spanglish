"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "@/features/auth/auth-client";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthButton } from "@/features/auth/components/auth-button";
import { AuthDivider } from "@/features/auth/components/auth-divider";
import { AuthField } from "@/features/auth/components/auth-field";
import { EmailCodeForm } from "@/features/auth/components/email-code-form";
import { GoogleButton } from "@/features/auth/components/google-button";
import { MethodTabs, type AuthMethodTab } from "@/features/auth/components/method-tabs";
import { useErrorText } from "@/features/auth/components/use-error-text";
import { VerifyEmailStep } from "@/features/auth/components/verify-email-step";
import type { DemoAccount } from "@/features/auth/data";
// Imported from lib (not the feature data module) so the seeded demo
// credentials are not bundled into the public login page.
import { emailErrorCode, passwordErrorCode } from "@/lib/auth-validation";

type LoginFormProps = {
  googleEnabled: boolean;
  codeTtlMinutes: number;
  /** Error key from a failed Google redirect (`?error=google`). */
  googleFailed?: boolean;
  /** Safe relative path to return to after signing in (`?next=`). */
  redirectTo?: string;
  /**
   * Seeded demo accounts to list under the form. The login page passes an
   * empty list unless demo accounts are enabled, so they never ship to the
   * public site.
   */
  demoAccounts?: DemoAccount[];
};

export function LoginForm({
  googleEnabled,
  codeTtlMinutes,
  googleFailed = false,
  redirectTo = "/dashboard",
  demoAccounts = [],
}: LoginFormProps) {
  const t = useTranslations();
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<AuthMethodTab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [error, setError] = useState<string | null>(
    googleFailed ? t("google.didNotFinish") : null,
  );

  const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validation = emailErrorCode(email) ?? passwordErrorCode(password);
    if (validation) {
      setError(errorText(validation));
      return;
    }

    startTransition(async () => {
      const { data, error: signInError } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (signInError) {
        if (signInError.code === "EMAIL_NOT_VERIFIED") {
          // Better Auth already emailed a fresh verification code.
          setNeedsVerification(true);
          return;
        }
        setError(errorText(signInError.code ? signInError : "INVALID_EMAIL_OR_PASSWORD"));
        return;
      }

      // Accounts with 2FA are sent to /two-factor by the client plugin.
      if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return;

      router.push(redirectTo);
      router.refresh();
    });
  };

  if (needsVerification) {
    return (
      <VerifyEmailStep
        email={email.trim()}
        intro={t("login.verifyIntro", { email: email.trim() })}
        codeTtlMinutes={codeTtlMinutes}
        onBack={() => setNeedsVerification(false)}
        redirectTo={redirectTo}
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
          onSubmit={handlePasswordSubmit}
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
            placeholder={t("login.passwordPlaceholder")}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
            labelAside={
              <Link
                href="/recover-password"
                className="text-xs font-semibold text-primary hover:text-primary-hover"
              >
                {t("login.forgot")}
              </Link>
            }
          />
          {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
          <AuthButton loading={pending}>{t("login.submit")}</AuthButton>
        </form>
      ) : (
        <EmailCodeForm
          email={email}
          onEmailChange={setEmail}
          codeTtlMinutes={codeTtlMinutes}
          redirectTo={redirectTo}
        />
      )}

      {demoAccounts.length ? (
        <details className="rounded-lg border border-[#e5eaef] bg-[#f9fbfd] px-3 py-2.5 text-xs text-[#5a6a85]">
          <summary className="cursor-pointer font-semibold text-[#2a3547]">
            {t("login.demoTitle")}
          </summary>
          <p className="mt-2">
            {t("login.demoIntro")} <strong>{demoAccounts[0]?.password}</strong>
          </p>
          <ul className="mt-2 space-y-1.5">
            {demoAccounts.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    setMethod("password");
                    setError(null);
                  }}
                  className="text-left font-medium text-primary hover:text-primary-hover"
                >
                  {account.email}
                </button>{" "}
                — {account.roles}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
