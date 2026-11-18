"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { adminBreadcrumb } from "@/features/admin/components/admin-breadcrumb-items";
import type { AdminDashboardCharts, LedgerSnapshot } from "@/features/admin";
import { FinanceLedgerChartsPanel } from "@/features/admin/components/finance-ledger-charts";

type Props = {
  snapshots: LedgerSnapshot[];
  charts: AdminDashboardCharts;
};

export function FinanceLedgerOverview({ snapshots, charts }: Props) {
  const t = useTranslations("admin");
  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("common.page.ledger")}
        subtitle={t("finance.ledger.subtitle")}
        items={adminBreadcrumb(t, t("common.section.finance"), t("common.page.ledgerShort"), "/admin/finance/ledger")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {t("finance.ledger.notice")}
      </Alert>

      <Grid container spacing={3}>
        {snapshots.map((row) => (
          <Grid key={row.id} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card elevation={9} sx={{ height: "100%" }}>
              <CardContent sx={{ p: "30px" }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {row.label}
                </Typography>
                <Typography variant="h4" fontWeight={700} color="primary.main" mt={1}>
                  {row.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  {row.trend}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box mt={3}>
        <FinanceLedgerChartsPanel data={charts} />
      </Box>
    </Box>
  );
}
