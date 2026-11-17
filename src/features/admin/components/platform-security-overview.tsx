"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { adminBreadcrumb } from "@/features/admin/components/admin-breadcrumb-items";

type PlatformSecurityOverviewProps = {
  captchaEnabled: boolean;
  demoAccountsEnabled: boolean;
  googleSignInEnabled: boolean;
};

export function PlatformSecurityOverview({
  captchaEnabled,
  demoAccountsEnabled,
  googleSignInEnabled,
}: PlatformSecurityOverviewProps) {
  const policies = [
    {
      id: "2fa",
      title: "Two-factor authentication",
      detail: "Optional for all accounts today. Staff should enable before handling payouts.",
      status: "Optional",
      href: "/settings?tab=security",
    },
    {
      id: "captcha",
      title: "Cloudflare Turnstile",
      detail: "Sign-up, code requests, and password reset when TURNSTILE_SECRET_KEY is set.",
      status: captchaEnabled ? "On" : "Off",
    },
    {
      id: "demo",
      title: "Demo accounts on login",
      detail: "Only development or ENABLE_DEMO_ACCOUNTS=true.",
      status: demoAccountsEnabled ? "Visible" : "Hidden",
    },
    {
      id: "google",
      title: "Google sign-in",
      detail: "OAuth with PKCE via Better Auth.",
      status: googleSignInEnabled ? "Enabled" : "Disabled",
    },
    {
      id: "admin",
      title: "Single academy admin",
      detail: "ADMIN_EMAIL or promote CLI; cannot change admin from the app.",
      status: "Enforced",
    },
  ];

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Security policy"
        subtitle="Platform-wide auth and access controls (read-only summary)."
        items={adminBreadcrumb("Platform", "Security", "/admin/platform/security")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        Sensitive values live in <code>src/env.ts</code> and deployment secrets, not in this UI.
      </Alert>

      <SectionCard title="Active policies">
        <Stack spacing={2} divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
          {policies.map((policy) => (
            <Stack
              key={policy.id}
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Box flex={1}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {policy.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {policy.detail}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" label={policy.status} />
                {policy.href ? (
                  <LinkButton href={policy.href} size="small">
                    Your 2FA
                  </LinkButton>
                ) : null}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </SectionCard>
    </Box>
  );
}