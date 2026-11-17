"use client";

import { useTranslations } from "next-intl";
import { AuthAlert } from "@/features/auth/components/auth-alert";

export function LoginResetNotice() {
  const t = useTranslations("login");
  return (
    <div className="mb-5">
      <AuthAlert tone="success">{t("resetDone")}</AuthAlert>
    </div>
  );
}
