"use client";

import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { IconArrowRight } from "@tabler/icons-react";
import { ApexChart } from "@/components/charts/apex-chart";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import type { AdminDashboardCharts } from "@/features/admin";
import {
  CHART_HEIGHT,
  CHART_HEIGHT_MINI,
  ChartCell,
  chartGridOps,
  classesByDayOptions,
  classStatusDonutOptions,
  paidRevenueByDayOptions,
} from "@/features/admin/components/admin-chart-kit";

type Props = {
  data: AdminDashboardCharts;
};

export function AdminOverviewChartsPanel({ data }: Props) {
  const theme = useTheme();
  const donutSeries = data.classStatus.map((item) => item.value);

  return (
    <SectionCard
      title="Operations"
      subtitle="Booking volume and a quick revenue pulse (last 7 days)."
      action={
        <LinkButton href="/admin/finance/ledger" size="small" endIcon={<IconArrowRight size={14} />}>
          Credit ledger
        </LinkButton>
      }
    >
      <Grid container spacing={3}>
        <Grid size={chartGridOps}>
          <ChartCell title="Sessions scheduled to start (daily)">
            <ApexChart
              options={classesByDayOptions(theme, data.classesByDay.categories)}
              series={[{ name: "Classes", data: data.classesByDay.values }]}
              type="bar"
              height={CHART_HEIGHT}
              width="100%"
            />
          </ChartCell>
        </Grid>

        <Grid size={chartGridOps}>
          <ChartCell title="All bookings by lifecycle status (now)">
            <ApexChart
              options={classStatusDonutOptions(
                theme,
                data.classStatus.map((item) => item.label),
              )}
              series={donutSeries}
              type="donut"
              height={CHART_HEIGHT}
              width="100%"
            />
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" mt={0.5}>
              <Typography variant="caption" color="text.secondary">
                Individual {data.classTypeMix.oneOnOne}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                · Paired {data.classTypeMix.paired}%
              </Typography>
            </Stack>
          </ChartCell>
        </Grid>

        <Grid size={chartGridOps}>
          <ChartCell title="Cash collected (USD per day)">
            <ApexChart
              options={paidRevenueByDayOptions(theme, data.paidRevenueByDay.categories, CHART_HEIGHT_MINI)}
              series={[{ name: "Revenue", data: data.paidRevenueByDay.values }]}
              type="area"
              height={CHART_HEIGHT_MINI}
              width="100%"
            />
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Full finance trends live under Credit ledger.
            </Typography>
          </ChartCell>
        </Grid>
      </Grid>
    </SectionCard>
  );
}