import type { Metadata } from "next";
import Link from "next/link";
import { AuthButton, AuthField, AuthShell } from "@/features/auth";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Request a password reset link",
};

export default function RecoverPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="We'll email you a link to choose a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:text-[#4570ea]"
          >
            Back to sign in
          </Link>
        </>
      }
    >
      <form className="space-y-5" aria-label="Password recovery form">
        <AuthField
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
        />
        <AuthButton>Send reset link</AuthButton>
      </form>
    </AuthShell>
  );
}
