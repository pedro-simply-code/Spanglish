"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { adminBreadcrumb } from "@/features/admin/components/admin-breadcrumb-items";
import type { TeacherRateTier } from "@/features/admin/types";

export function CommerceTeacherRatesOverview({ tiers }: { tiers: TeacherRateTier[] }) {
  const t = useTranslations("admin");
  return (
    <Box>
      <Breadcrumb
        title={t("commerce.teacherRates.title")}
        subtitle={t("commerce.teacherRates.subtitle")}
        items={adminBreadcrumb(t, t("common.section.commerce"), t("common.page.teacherRates"), "/admin/commerce/teacher-rates")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {t("commerce.teacherRates.noticePrefix")}{" "}
        <LinkButton href="/admin/finance/teacher-rates" size="small" sx={{ verticalAlign: "baseline", px: 0.5 }}>
          {t("common.teacherPayRates")}
        </LinkButton>
        {t("commerce.teacherRates.noticeSuffix")}
      </Alert>

      <Grid container spacing={3}>
        {tiers.length === 0 ? (
          <Grid size={12}>
            <Alert severity="warning">{t("commerce.teacherRates.empty")}</Alert>
          </Grid>
        ) : null}
        {tiers.map((tier) => (
          <Grid key={tier.id} size={{ xs: 12, md: 4 }}>
            <SectionCard
              title={tier.label}
              subtitle={t("commerce.teacherRates.levelCohort")}
              action={<Chip label={t("commerce.teacherRates.teacherCount", { count: tier.teachers })} size="small" />}
            >
              <Typography variant="body2" color="text.secondary">
                {tier.description}
              </Typography>
              <Stack direction="row" spacing={1} mt={2}>
                <Chip label={t("commerce.teacherRates.autoAssign")} size="small" variant="outlined" />
                <Chip label={t("commerce.teacherRates.adminOverride")} size="small" variant="outlined" />
              </Stack>
            </SectionCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
