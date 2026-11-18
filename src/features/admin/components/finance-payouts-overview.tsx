"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
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
import type { PayoutBatch } from "@/features/admin/types";
import type { TeacherEarningsRow } from "@/features/admin";

const statusColor = {
  draft: "default" as const,
  "awaiting-approval": "warning" as const,
  paid: "success" as const,
};

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function FinancePayoutsOverview({
  batches,
  teachers = [],
}: {
  batches: PayoutBatch[];
  teachers?: TeacherEarningsRow[];
}) {
  const t = useTranslations("admin");
  const pending = batches.filter((batch) => batch.status === "awaiting-approval");

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("common.page.payouts")}
        subtitle={t("finance.payouts.subtitle")}
        items={adminBreadcrumb(t, t("common.section.finance"), t("common.page.payoutsShort"), "/admin/finance/payouts")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {t("finance.payouts.notice", { count: pending.length })}
      </Alert>

      {teachers.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <SectionCard
            title={t("finance.payouts.byTeacher")}
            subtitle={t("finance.payouts.byTeacherSubtitle")}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("common.teacher")}</TableCell>
                  <TableCell align="right">{t("finance.payouts.classes")}</TableCell>
                  <TableCell align="right">{t("finance.payouts.tuitionGross")}</TableCell>
                  <TableCell align="right">{t("finance.payouts.payoutEst")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teachers.map((row) => (
                  <TableRow key={row.teacherName} hover>
                    <TableCell>{row.teacherName}</TableCell>
                    <TableCell align="right">{row.classesTaught}</TableCell>
                    <TableCell align="right">{formatUsd(row.grossUsd)}</TableCell>
                    <TableCell align="right">{formatUsd(row.payoutUsd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </Box>
      ) : null}

      <SectionCard title={t("finance.payouts.batches")} subtitle={t("finance.payouts.batchesSubtitle")}>
        {batches.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("finance.payouts.empty")}
          </Typography>
        ) : null}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("finance.payouts.period")}</TableCell>
              <TableCell>{t("common.manager")}</TableCell>
              <TableCell align="right">{t("common.teachers")}</TableCell>
              <TableCell align="right">{t("common.total")}</TableCell>
              <TableCell>{t("common.status")}</TableCell>
              <TableCell align="right">{t("common.action")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batches.map((batch) => (
              <TableRow key={batch.id} hover>
                <TableCell>
                  <Typography fontWeight={600}>{batch.period}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {batch.id}
                  </Typography>
                </TableCell>
                <TableCell>{batch.manager}</TableCell>
                <TableCell align="right">{batch.teachers}</TableCell>
                <TableCell align="right">{batch.totalUsd}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={statusColor[batch.status]}
                    label={t(`finance.payouts.status.${batch.status}`)}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" variant="contained" disabled={batch.status !== "awaiting-approval"}>
                    {t("finance.payouts.approveAndPay")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </Box>
  );
}
