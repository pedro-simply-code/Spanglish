"use client";

import { useTranslations } from "next-intl";

type ErrorLike =
  | { code?: string | null; message?: string | null; status?: number }
  | string
  | null
  | undefined;

/**
 * Turns an error code (Better Auth `error.code`, a Server Action `code`, or a
 * validation code) into a translated message.
 */
export function useErrorText() {
  const t = useTranslations();

  return (error: ErrorLike) => {
    const code = typeof error === "string" ? error : error?.code ?? undefined;
    if (code) {
      if (t.has(`errors.${code}`)) return t(`errors.${code}`);
      if (t.has(`validation.${code}`)) return t(`validation.${code}`);
    }
    if (typeof error === "object" && error?.status === 429) {
      return t("errors.TOO_MANY_REQUESTS");
    }
    return t("errors.generic");
  };
}
