"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { verifyPendingTwoFactorAction } from "@/features/auth/actions";
import { authClient } from "@/features/auth/auth-client";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthButton } from "@/features/auth/components/auth-button";
import { AuthField } from "@/features/auth/components/auth-field";
import { useErrorText } from "@/features/auth/components/use-error-text";
import { codeErrorCode } from "@/lib/auth-validation";

type TwoFactorFormProps = {
  /**
   * `challenge`: email + password sign-in, verified by Better Auth's
   * two-factor cookie. `pending`: email-code or Google sign-in whose session
   * waits for the code (verified by a Server Action).
   */
  mode: "challenge" | "pending";
};

export function TwoFactorForm({ mode }: TwoFactorFormProps) {
  const t = useTranslations("twoFactor");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = (redirectTo = "/dashboard") => {
    router.push(redirectTo);
    router.refresh();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const value = code.trim();
    const validation =
      kind === "totp" ? codeErrorCode(value) : value ? null : "BACKUP_CODE_REQUIRED";
    if (validation) {
      setError(errorText(validation));
      return;
    }

    startTransition(async () => {
      if (mode === "pending") {
        const result = await verifyPendingTwoFactorAction({ code: value, kind });
        if (!result.ok) {
          setError(errorText(result.code ?? "INVALID_CODE"));
          if (result.redirectTo) router.push(result.redirectTo);
          return;
        }
        finish(result.redirectTo);
        return;
      }

      const { error: verifyError } =
        kind === "totp"
          ? await authClient.twoFactor.verifyTotp({ code: value, trustDevice })
          : await authClient.twoFactor.verifyBackupCode({ code: value, trustDevice });

      if (verifyError) {
        setError(errorText(verifyError.code ? verifyError : "INVALID_CODE"));
        return;
      }
      finish();
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {kind === "totp" ? (
        <AuthField
          id="totp"
          label={t("totpLabel")}
          placeholder="123456"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          disabled={pending}
          maxLength={6}
          inputMode="numeric"
          hint={t("totpHint")}
          autoFocus
        />
      ) : (
        <AuthField
          id="backup-code"
          label={t("backupLabel")}
          placeholder="xxxxx-xxxxx"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          disabled={pending}
          maxLength={32}
          hint={t("backupHint")}
          autoFocus
        />
      )}

      {mode === "challenge" ? (
        <label className="flex items-center gap-2 text-sm text-[#5a6a85]">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(event) => setTrustDevice(event.target.checked)}
            disabled={pending}
          />
          {t("trust")}
        </label>
      ) : null}

      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
      <AuthButton loading={pending}>{t("submit")}</AuthButton>

      <div className="flex items-center justify-between text-xs font-semibold">
        <button
          type="button"
          className="text-primary hover:text-primary-hover"
          onClick={() => {
            setKind(kind === "totp" ? "backup" : "totp");
            setCode("");
            setError(null);
          }}
        >
          {kind === "totp" ? t("useBackup") : t("useApp")}
        </button>
        <Link href="/login" className="text-[#5a6a85] hover:text-[#2a3547]">
          {t("startOver")}
        </Link>
      </div>
    </form>
  );
}
