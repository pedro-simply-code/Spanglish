import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell, TwoFactorForm } from "@/features/auth";
import { getAuthState } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Two-factor verification",
  description: "Enter your authenticator code",
};

export default function TwoFactorPage() {
  return (
    <AuthShell screen="twoFactor">
      <Suspense fallback={null}>
        <TwoFactorContent />
      </Suspense>
    </AuthShell>
  );
}

async function TwoFactorContent() {
  const state = await getAuthState();
  if (state.status === "signed-in") redirect("/dashboard");

  // Pending: email-code or Google sign-in waiting for its code.
  // Signed out: email + password sign-in; Better Auth's 2FA cookie carries it.
  return (
    <TwoFactorForm
      mode={state.status === "two-factor-pending" ? "pending" : "challenge"}
    />
  );
}
