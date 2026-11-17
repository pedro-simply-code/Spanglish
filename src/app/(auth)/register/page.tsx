import type { Metadata } from "next";
import { env } from "@/env";
import { AuthShell, RegisterForm } from "@/features/auth";
import { googleSignInEnabled } from "@/server/auth/auth";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Spanglish account",
};

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
