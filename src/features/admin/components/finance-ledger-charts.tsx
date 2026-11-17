"use client";

import Grid from "@mui/material/Grid";
import { useTheme } from "@mui/material/styles";
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
  const theme = useTheme();

  return (
    <SectionCard title="Trends (7 days)" subtitle="Revenue, orders, delivery, and lifetime totals from PostgreSQL.">
      <Grid container spacing={3}>
        <Grid size={chartGridFinance}>
          <ChartCell title="Cash collected from paid packages (USD per day)">
            <ApexChart
              options={paidRevenueByDayOptions(theme, data.paidRevenueByDay.categories)}
              series={[{ name: "Revenue", data: data.paidRevenueByDay.values }]}
              type="area"
              height={CHART_HEIGHT}
              width="100%"
            />
          </ChartCell>
        </Grid>

        <Grid size={chartGridFinance}>
          <ChartCell title="Teacher payout earned per delivered class (USD per day)">
            <ApexChart
              options={teacherEarningsByDayOptions(theme, data.teacherEarningsByDay.categories)}
              series={[{ name: "Earnings", data: data.teacherEarningsByDay.values }]}
              type="line"
              height={CHART_HEIGHT}
              width="100%"
            />
          </ChartCell>
        </Grid>

        <Grid size={chartGridFinance}>
          <ChartCell title="Package checkouts marked paid (count per day)">
            <ApexChart
              options={dayCountBarOptions(theme, data.paidOrdersByDay.categories, theme.palette.secondary.main)}
              series={[{ name: "Orders", data: data.paidOrdersByDay.values }]}
              type="bar"
              height={CHART_HEIGHT}
              width="100%"
            />
          </ChartCell>
        </Grid>

        <Grid size={chartGridFinance}>
          <ChartCell title="Classes marked delivered with earnings (count per day)">
            <ApexChart
              options={dayCountBarOptions(theme, data.classesDeliveredByDay.categories, theme.palette.success.dark)}
              series={[{ name: "Delivered", data: data.classesDeliveredByDay.values }]}
              type="bar"
              height={CHART_HEIGHT}
              width="100%"
            />
          </ChartCell>
        </Grid>

        <Grid size={chartGridFinance}>
          <ChartCell title="All-time revenue, earned, paid out, and unsettled teacher pay (USD)">
            <ApexChart
              options={financeTotalsBarOptions(theme)}
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