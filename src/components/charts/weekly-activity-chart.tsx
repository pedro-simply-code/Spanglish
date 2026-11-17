"use client";

import { useTheme } from "@mui/material/styles";
import type { ApexOptions } from "apexcharts";
import { ApexChart } from "@/components/charts/apex-chart";

type WeeklyActivityChartProps = {
  categories: string[];
  data: number[];
  height?: number;
  label?: string;
};

export function WeeklyActivityChart({
  categories,
  data,
  height = 300,
  label = "Study minutes",
}: WeeklyActivityChartProps) {
  const theme = useTheme();

  const options: ApexOptions = {
    chart: {
      type: "area",
      fontFamily: theme.typography.fontFamily,
      foreColor: "#adb0bb",
      toolbar: { show: false },
      height,
    },
    colors: [theme.palette.primary.main],
    stroke: { curve: "smooth", width: 3 },
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
    yaxis: { labels: { formatter: (value: number) => `${value}m` } },
    tooltip: { theme: "light", fillSeriesColor: false },
  };

  return (
    <ApexChart
      options={options}
      series={[{ name: label, data }]}
      type="area"
      height={height}
      width="100%"
    />
  );
}
