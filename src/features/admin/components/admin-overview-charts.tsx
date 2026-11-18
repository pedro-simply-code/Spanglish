"use client";

import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { IconArrowRight } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("admin");
  const theme = useTheme();
  const donutSeries = data.classStatus.map((item) => item.value);

  return (
    <SectionCard
      title={t("overview.operations.title")}
      subtitle={t("overview.operations.subtitle")}
      action={
        <LinkButton href="/admin/finance/ledger" size="small" endIcon={<IconArrowRight size={14} />}>
          {t("common.page.ledger")}
        </LinkButton>
      }
    >
      <Grid container spacing={3}>
        <Grid size={chartGridOps}>
          <ChartCell title={t("overview.chart.sessions")}>
            <ApexChart
              options={classesByDayOptions(theme, data.classesByDay.categories)}
              series={[{ name: t("overview.chart.classes"), data: data.classesByDay.values }]}
              type="bar"
              height={CHART_HEIGHT}
              width="100%"
            />
          </ChartCell>
        </Grid>

        <Grid size={chartGridOps}>
          <ChartCell title={t("overview.chart.bookings")}>
            <ApexChart
              options={classStatusDonutOptions(
                theme,
                data.classStatus.map((item) => item.label),
                t,
              )}
              series={donutSeries}
              type="donut"
              height={CHART_HEIGHT}
              width="100%"
            />
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" mt={0.5}>
              <Typography variant="caption" color="text.secondary">
                {t("overview.chart.individual", { percent: data.classTypeMix.oneOnOne })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("overview.chart.paired", { percent: data.classTypeMix.paired })}
              </Typography>
            </Stack>
          </ChartCell>
        </Grid>

        <Grid size={chartGridOps}>
          <ChartCell title={t("overview.chart.cashCollected")}>
            <ApexChart
              options={paidRevenueByDayOptions(theme, data.paidRevenueByDay.categories, CHART_HEIGHT_MINI)}
              series={[{ name: t("overview.chart.revenue"), data: data.paidRevenueByDay.values }]}
              type="area"
              height={CHART_HEIGHT_MINI}
              width="100%"
            />
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              {t("overview.chart.fullFinanceHint")}
            </Typography>
          </ChartCell>
        </Grid>
      </Grid>
    </SectionCard>
  );
}
