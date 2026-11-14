import type { Metadata } from "next";
import Link from "next/link";
import { AuthButton, AuthField, AuthShell } from "@/features/auth";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Spanglish account",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Start learning Spanish at your own pace."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:text-[#4570ea]"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-5" aria-label="Registration form">
        <AuthField
          id="name"
          label="Full name"
          type="text"
          placeholder="Alex Johnson"
          autoComplete="name"
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <AuthField
          id="password-confirm"
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <AuthButton>Create account</AuthButton>
        <p className="text-center text-xs text-[#7c8fac]">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>
    </AuthShell>
  );
}
