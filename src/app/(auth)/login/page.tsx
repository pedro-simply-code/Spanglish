import type { Metadata } from "next";
import Link from "next/link";
import { AuthButton, AuthField, AuthShell } from "@/features/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Spanglish account",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to continue your learning journey."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-primary hover:text-[#4570ea]"
          >
            Create one
          </Link>
        </>
      }
    >
      <form className="space-y-5" aria-label="Sign in form">
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
          autoComplete="current-password"
          labelAside={
            <Link
              href="/recover-password"
              className="text-xs font-semibold text-primary hover:text-[#4570ea]"
            >
              Forgot password?
            </Link>
          }
        />
        <AuthButton>Sign in</AuthButton>
      </form>
    </AuthShell>
  );
}
