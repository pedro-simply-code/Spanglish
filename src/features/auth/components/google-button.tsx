"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/features/auth/auth-client";
import { AuthButton } from "@/features/auth/components/auth-button";

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.89c2.28-2.1 3.56-5.19 3.56-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.96-2.89l-3.89-3.02c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.12A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.6H1.26a12 12 0 0 0 0 10.8l4.01-3.12Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.98 11.98 0 0 0 1.26 6.6l4.01 3.12C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  );
}

/**
 * Google sign-in and sign-up (OAuth with PKCE, handled by Better Auth). New
 * accounts land on onboarding; existing ones on their dashboard.
 */
export function GoogleButton() {
  const t = useTranslations("google");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = () => {
    setMessage(null);
    startTransition(async () => {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
        newUserCallbackURL: "/onboarding",
        errorCallbackURL: "/login?error=google",
      });

      if (error) {
        setMessage(t("failed"));
      }
    });
  };

  return (
    <div className="space-y-2">
      <AuthButton
        type="button"
        variant="secondary"
        loading={pending}
        onClick={handleClick}
      >
        {pending ? (
          t("connecting")
        ) : (
          <>
            <GoogleIcon />
            {t("continue")}
          </>
        )}
      </AuthButton>
      {message ? (
        <p className="text-center text-xs text-red-600" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
