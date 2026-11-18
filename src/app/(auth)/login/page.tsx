import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { AuthShell, LoginForm, LoginResetNotice } from "@/features/auth";
import { googleSignInEnabled } from "@/server/auth/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("loginTitle"),
    description: t("loginDescription"),
  };
}

type LoginPageProps = {
  searchParams: Promise<{ error?: string; reset?: string; next?: string }>;
};

/** Only same-site relative paths are allowed as a return destination. */
function safeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/dashboard";
  }
  return value;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <AuthShell screen="login" footer="toRegister">
      <Suspense fallback={null}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function LoginContent({ searchParams }: LoginPageProps) {
  const query = await searchParams;

  return (
    <>
      {query.reset === "1" ? <LoginResetNotice /> : null}
      <LoginForm
        googleEnabled={googleSignInEnabled}
        codeTtlMinutes={env.EMAIL_CODE_TTL_MINUTES}
        googleFailed={query.error === "google"}
        redirectTo={safeNext(query.next)}
        demoAccounts={[]}
      />
    </>
  );
}
