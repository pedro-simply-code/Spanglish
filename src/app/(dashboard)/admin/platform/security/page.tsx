import type { Metadata } from "next";
import { env } from "@/env";
import { PlatformSecurityOverview } from "@/features/admin";
import { captchaEnabled, googleSignInEnabled } from "@/server/auth/auth";

export const metadata: Metadata = {
  title: "Security policy",
  description: "Platform authentication and access controls",
};

export default function AdminPlatformSecurityPage() {
  const demoAccountsEnabled =
    env.NODE_ENV === "development" || env.ENABLE_DEMO_ACCOUNTS;

  return (
    <PlatformSecurityOverview
      captchaEnabled={captchaEnabled}
      demoAccountsEnabled={demoAccountsEnabled}
      googleSignInEnabled={googleSignInEnabled}
    />
  );
}