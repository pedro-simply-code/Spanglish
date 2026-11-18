"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { type Theme } from "@mui/material/styles";
import type { ApexOptions } from "apexcharts";
import type { AdminDashboardCharts } from "@/features/admin";

export const CHART_HEIGHT = 220;
export const CHART_HEIGHT_MINI = 168;

export const chartGridFinance = { xs: 12, sm: 6, lg: 4 } as const;
export const chartGridOps = { xs: 12, sm: 6, lg: 4 } as const;

export function chartBase(theme: Theme, height = CHART_HEIGHT) {
  return {
    fontFamily: theme.typography.fontFamily,
    foreColor: "#adb0bb",
    toolbar: { show: false as const },
    height,
  };
}

export function ChartCell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ height: "100%", minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" mb={1} fontWeight={500}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export function dayCountBarOptions(theme: Theme, categories: string[], color: string, height = CHART_HEIGHT): ApexOptions {
  return {
    chart: { type: "bar", ...chartBase(theme, height) },
    colors: [color],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "65%" } },
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 3 },
    xaxis: {
      categories,
      labels: { rotate: -45, style: { fontSize: "10px" } },
    },
    yaxis: { tickAmount: 3, labels: { formatter: (v: number) => `${Math.round(v)}` } },
    tooltip: { theme: "light" },
  };
}

export function classesByDayOptions(theme: Theme, categories: string[], height = CHART_HEIGHT): ApexOptions {
  return {
    chart: { type: "bar", ...chartBase(theme, height) },
    colors: [theme.palette.primary.main],
    plotOptions: { bar: { borderRadius: 6, columnWidth: "65%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "rgba(0,0,0,0.08)", strokeDashArray: 3 },
    xaxis: {
      categories,
      axisBorder: { show: false },
      labels: { rotate: -45, style: { fontSize: "10px" } },
    },
    yaxis: { tickAmount: 3, labels: { formatter: (v: number) => `${Math.round(v)}` } },
    tooltip: { theme: "light" },
  };
}

type Translator = (key: string) => string;

export function classStatusDonutOptions(
  theme: Theme,
  labels: string[],
  t: Translator,
  height = CHART_HEIGHT,
): ApexOptions {
  return {
    chart: { type: "donut", ...chartBase(theme, height) },
    labels,
    colors: [
      theme.palette.primary.main,
      theme.palette.warning.main,
      theme.palette.success.main,
      theme.palette.grey[400],
    ],
    dataLabels: { enabled: false },
    legend: { position: "bottom", fontSize: "11px" },
    plotOptions: {
      pie: {
        donut: {
          size: "62%",
          labels: { show: true, total: { show: true, label: t("common.total"), fontSize: "11px" } },
        },
      },
    },
  };
}

export function paidRevenueByDayOptions(theme: Theme, categories: string[], height = CHART_HEIGHT): ApexOptions {
  return {
    chart: { type: "area", ...chartBase(theme, height) },
    colors: [theme.palette.success.main],
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 3 },
    xaxis: {
      categories,
      labels: { rotate: -45, style: { fontSize: "10px" } },
    },
    yaxis: {
      tickAmount: 3,
      labels: {
        formatter: (value: number) =>
          new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
            value,
          ),
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) =>
          new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value),
      },
    },
  };
}

export function teacherEarningsByDayOptions(theme: Theme, categories: string[], height = CHART_HEIGHT): ApexOptions {
  return {
    chart: { type: "line", ...chartBase(theme, height) },
    colors: [theme.palette.warning.main],
    stroke: { curve: "smooth", width: 2 },
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 3 },
    xaxis: {
      categories,
      labels: { rotate: -45, style: { fontSize: "10px" } },
    },
    yaxis: {
      tickAmount: 3,
      labels: {
        formatter: (value: number) =>
          new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
            value,
          ),
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) =>
          new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value),
      },
    },
  };
}

export function financeTotalsBarOptions(theme: Theme, t: Translator, height = CHART_HEIGHT): ApexOptions {
  return {
    chart: { type: "bar", ...chartBase(theme, height) },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "70%" } },
    colors: [
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.primary.main,
      theme.palette.error.light,
    ],
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 3 },
    xaxis: {
      categories: [
        t("finance.ledger.chart.revenue"),
        t("finance.ledger.chart.earned"),
        t("finance.ledger.chart.paid"),
        t("finance.ledger.chart.unsettled"),
      ],
      axisBorder: { show: false },
      labels: { style: { fontSize: "10px" } },
    },
    yaxis: {
      tickAmount: 3,
      labels: {
        formatter: (value: number) =>
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(value),
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) =>
          new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value),
      },
    },
  };
}

export function financeTotalsSeries(data: AdminDashboardCharts) {
  return [
    data.financeTotalsUsd.revenue,
    data.financeTotalsUsd.earned,
    data.financeTotalsUsd.paid,
    data.financeTotalsUsd.unbatched,
  ];
}