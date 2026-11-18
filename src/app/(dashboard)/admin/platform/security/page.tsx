import type { Metadata } from "next";
import { env } from "@/env";
import { PlatformSecurityOverview } from "@/features/admin";
import { adminStaticMetadata } from "@/i18n/static-page-metadata";
import { captchaEnabled, googleSignInEnabled } from "@/server/auth/platform-flags";

export const metadata: Metadata = adminStaticMetadata("security");

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
