"use client";

import { useTheme } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import type { ApexOptions } from "apexcharts";
import { ApexChart } from "@/components/charts/apex-chart";

type WeeklyActivityChartProps = {
  categories: string[];
  data: number[];
  height?: number;
  label?: string;
  /** Suffix for the y-axis values ("m" for minutes, "" for counts). */
  unitSuffix?: string;
};

export function WeeklyActivityChart({
  categories,
  data,
  height = 300,
  label,
  unitSuffix = "m",
}: WeeklyActivityChartProps) {
  const t = useTranslations("shell");
  const theme = useTheme();
  const seriesLabel = label ?? t("chart.studyMinutes");

  const options: ApexOptions = {
    chart: {
      type: "area",
      fontFamily: theme.typography.fontFamily,
      foreColor: "#adb0bb",
      toolbar: { show: false },
      height,
    },
    colors: [theme.palette.primary.main],
    // monotoneCubic keeps the line from dipping below zero between points.
    stroke: { curve: "monotoneCubic", width: 3 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: "rgba(0,0,0,0.1)", strokeDashArray: 3 },
    xaxis: {
      categories,
      axisBorder: { show: false },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: { formatter: (value: number) => `${Math.round(value)}${unitSuffix}` },
    },
    tooltip: { theme: "light", fillSeriesColor: false },
  };

  return (
    <ApexChart
      options={options}
      series={[{ name: seriesLabel, data }]}
      type="area"
      height={height}
      width="100%"
    />
  );
}
