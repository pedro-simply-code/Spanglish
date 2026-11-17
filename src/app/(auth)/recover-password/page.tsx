import type { Metadata } from "next";
import { env } from "@/env";
import { AuthShell, RecoverPasswordForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Reset your password with an email code",
};

export default function RecoverPasswordPage() {
  return (
    <AuthShell screen="recover" footer="remembered">
      <RecoverPasswordForm codeTtlMinutes={env.EMAIL_CODE_TTL_MINUTES} />
    </AuthShell>
  );
}
