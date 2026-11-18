import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { AuthShell, RecoverPasswordForm } from "@/features/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("recoverTitle"),
    description: t("recoverDescription"),
  };
}

export default function RecoverPasswordPage() {
  return (
    <AuthShell screen="recover" footer="remembered">
      <RecoverPasswordForm codeTtlMinutes={env.EMAIL_CODE_TTL_MINUTES} />
    </AuthShell>
  );
}
