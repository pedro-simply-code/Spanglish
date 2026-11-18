import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { AuthShell, RegisterForm } from "@/features/auth";
import { googleSignInEnabled } from "@/server/auth/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("registerTitle"),
    description: t("registerDescription"),
  };
}

export default function RegisterPage() {
  return (
    <AuthShell screen="register" footer="toLogin">
      <RegisterForm
        googleEnabled={googleSignInEnabled}
        codeTtlMinutes={env.EMAIL_CODE_TTL_MINUTES}
      />
    </AuthShell>
  );
}
