"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("admin");
  const policies = [
    {
      id: "2fa",
      title: t("platform.security.twoFactor.title"),
      detail: t("platform.security.twoFactor.detail"),
      status: t("platform.security.status.optional"),
      href: "/settings?tab=security",
    },
    {
      id: "captcha",
      title: "Cloudflare Turnstile",
      detail: t("platform.security.captchaDetail"),
      status: t(captchaEnabled ? "common.on" : "common.off"),
    },
    {
      id: "demo",
      title: t("platform.security.demoAccounts"),
      detail: t("platform.security.demoDetail"),
      status: t(demoAccountsEnabled ? "platform.security.status.visible" : "platform.security.status.hidden"),
    },
    {
      id: "google",
      title: t("platform.security.googleSignIn"),
      detail: t("platform.security.googleDetail"),
      status: t(googleSignInEnabled ? "common.enabled" : "common.disabled"),
    },
    {
      id: "admin",
      title: t("platform.security.singleAdmin"),
      detail: t("platform.security.singleAdminDetail"),
      status: t("platform.security.status.enforced"),
    },
  ];

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("common.page.security")}
        subtitle={t("platform.security.subtitle")}
        items={adminBreadcrumb(t, t("common.section.platform"), t("common.page.security"), "/admin/platform/security")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {t("platform.security.notice")}
      </Alert>

      <SectionCard title={t("platform.security.activePolicies")}>
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
                    {t("platform.security.your2fa")}
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
