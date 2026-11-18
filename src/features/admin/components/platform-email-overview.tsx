"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import { adminBreadcrumb } from "@/features/admin/components/admin-breadcrumb-items";
import type { EmailHealthRow } from "@/features/admin/types";

type PlatformEmailOverviewProps = {
  emailProvider: string;
  health: EmailHealthRow[];
};

const statusColor = {
  ok: "success" as const,
  watch: "warning" as const,
  action: "error" as const,
};

export function PlatformEmailOverview({ emailProvider, health }: PlatformEmailOverviewProps) {
  const t = useTranslations("admin");
  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("common.page.email")}
        subtitle={t("platform.email.subtitle")}
        items={adminBreadcrumb(t, t("common.section.platform"), t("common.page.email"), "/admin/platform/email")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {t("platform.email.noticePrefix")} <strong>{emailProvider}</strong>{" "}
        {t("platform.email.noticeMiddle")} <strong>{t("common.emailInApp")}</strong>.{" "}
        {t("platform.email.noticeSuffix")}
      </Alert>

      <SectionCard title={t("platform.email.health")} subtitle={t("platform.email.healthSubtitle")}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("platform.email.metric")}</TableCell>
              <TableCell align="right">{t("common.value")}</TableCell>
              <TableCell>{t("common.status")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {health.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.metric}</TableCell>
                <TableCell align="right">
                  <Typography fontWeight={600}>{row.value}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={statusColor[row.status]}
                    label={t(`platform.email.status.${row.status}`)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Stack mt={2}>
          <Typography variant="body2" color="text.secondary">
            {t("platform.email.dnsHint")}
          </Typography>
        </Stack>
      </SectionCard>
    </Box>
  );
}
