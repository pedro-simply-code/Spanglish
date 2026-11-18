"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconExternalLink } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import type { AcademyPlan } from "@/features/academy/data";
import { adminBreadcrumb } from "@/features/admin/components/admin-breadcrumb-items";
import type { CommercePackageRow } from "@/features/admin/types";

export function CommercePublishOverview({
  plans,
  packages,
}: {
  plans: AcademyPlan[];
  packages: CommercePackageRow[];
}) {
  const t = useTranslations("admin");
  const liveCount = packages.filter((row) => row.active).length;
  const draftCount = packages.length - liveCount;

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("commerce.publish.title")}
        subtitle={t("commerce.publish.subtitle")}
        items={adminBreadcrumb(t, t("common.section.commerce"), t("common.page.publish"), "/admin/commerce/publish")}
      >
        <LinkButton
          href="/pricing"
          variant="outlined"
          endIcon={<IconExternalLink size={16} />}
          target="_blank"
        >
          {t("common.viewPublicPricing")}
        </LinkButton>
      </Breadcrumb>

      <Alert severity="warning" sx={{ mb: 3 }}>
        {t("commerce.publish.notice", { count: plans.length })}
      </Alert>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionCard title={t("commerce.publish.snapshot")}>
            <Stack spacing={1}>
              <Typography variant="body2">
                {t("commerce.publish.livePackages")}: <strong>{liveCount}</strong>
              </Typography>
              <Typography variant="body2">
                {t("commerce.publish.drafts")}: <strong>{draftCount}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("commerce.publish.lastPublish")}
              </Typography>
            </Stack>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <SectionCard
            title={t("commerce.publish.queued")}
            subtitle={t("commerce.publish.queuedSubtitle")}
          >
            <Stack spacing={1.5}>
              {packages.map((row) => (
                <Stack
                  key={row.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="body2">{row.name}</Typography>
                  <Chip
                    size="small"
                    label={row.active ? t("commerce.publish.included") : t("commerce.publish.heldBack")}
                    color={row.active ? "success" : "default"}
                  />
                </Stack>
              ))}
            </Stack>
            <Button variant="contained" disabled sx={{ mt: 3 }}>
              {t("commerce.publish.publishButton")}
            </Button>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
