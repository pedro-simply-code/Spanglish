"use client";

import Grid from "@mui/material/Grid";
import { useTheme } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { ApexChart } from "@/components/charts/apex-chart";
import { SectionCard } from "@/components/ui/section-card";
import type { AdminDashboardCharts } from "@/features/admin";
import {
  CHART_HEIGHT,
  ChartCell,
  chartGridFinance,
  dayCountBarOptions,
  financeTotalsBarOptions,
  financeTotalsSeries,
  paidRevenueByDayOptions,
  teacherEarningsByDayOptions,
} from "@/features/admin/components/admin-chart-kit";

type Props = {
  data: AdminDashboardCharts;
};

export function FinanceLedgerChartsPanel({ data }: Props) {
  const t = useTranslations("admin");
  const theme = useTheme();

  return (
    <SectionCard
      title={t("finance.ledger.charts.title")}
      subtitle={t("finance.ledger.charts.subtitle")}
    >
      <Grid container spacing={3}>
        <Grid size={chartGridFinance}>
          <ChartCell title={t("finance.ledger.charts.cashCollected")}>
            <ApexChart
              options={paidRevenueByDayOptions(theme, data.paidRevenueByDay.categories)}
              series={[{ name: t("finance.ledger.chart.revenue"), data: data.paidRevenueByDay.values }]}
              type="area"
              height={CHART_HEIGHT}
              width="100%"
            />
          </ChartCell>
        </Grid>

        <Grid size={chartGridFinance}>
          <ChartCell title={t("finance.ledger.charts.teacherEarnings")}>
            <ApexChart
              options={teacherEarningsByDayOptions(theme, data.teacherEarningsByDay.categories)}
              series={[{ name: t("finance.ledger.chart.earned"), data: data.teacherEarningsByDay.values }]}
              type="line"
              height={CHART_HEIGHT}
              width="100%"
            />
          </ChartCell>
        </Grid>

        <Grid size={chartGridFinance}>
          <ChartCell title={t("finance.ledger.charts.paidCheckouts")}>
            <ApexChart
              options={dayCountBarOptions(theme, data.paidOrdersByDay.categories, theme.palette.secondary.main)}
              series={[{ name: t("finance.ledger.chart.orders"), data: data.paidOrdersByDay.values }]}
              type="bar"
              height={CHART_HEIGHT}
              width="100%"
            />
          </ChartCell>
        </Grid>

        <Grid size={chartGridFinance}>
          <ChartCell title={t("finance.ledger.charts.deliveredClasses")}>
            <ApexChart
              options={dayCountBarOptions(theme, data.classesDeliveredByDay.categories, theme.palette.success.dark)}
              series={[{ name: t("finance.ledger.chart.delivered"), data: data.classesDeliveredByDay.values }]}
              type="bar"
              height={CHART_HEIGHT}
              width="100%"
            />
          </ChartCell>
        </Grid>

        <Grid size={chartGridFinance}>
          <ChartCell title={t("finance.ledger.charts.lifetimeTotals")}>
            <ApexChart
              options={financeTotalsBarOptions(theme, t)}
              series={[{ name: "USD", data: financeTotalsSeries(data) }]}
              type="bar"
              height={CHART_HEIGHT}
              width="100%"
            />
          </ChartCell>
        </Grid>
      </Grid>
    </SectionCard>
  );
}
