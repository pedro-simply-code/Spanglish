"use client";

import type { ComponentType, ReactNode } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBuildingBank,
  IconChartLine,
  IconCircleCheck,
  IconCoins,
  IconInfoCircle,
  IconReceipt2,
  IconUsers,
} from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { ApexChart } from "@/components/charts/apex-chart";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { adminAuditActionKeys } from "@/features/admin/components/audit-action-keys";
import type { AdminAlert, AdminHome } from "@/features/admin/types";

type ExecutiveOverviewProps = {
  firstName: string;
  timeZone: string;
  home: AdminHome;
};

const severityColor = { info: "info", warning: "warning", critical: "error" } as const;

function Tile({
  label,
  value,
  helper,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: string;
  helper: ReactNode;
  icon: ComponentType<{ size?: number }>;
  color: "primary" | "success" | "warning" | "secondary" | "error";
  href: string;
}) {
  return (
    <Card elevation={9} sx={{ height: "100%" }}>
      <CardActionArea href={href} sx={{ height: "100%" }}>
      <CardContent sx={{ p: { xs: "16px", sm: "24px" } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }} alignItems={{ sm: "center" }}>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 44, height: 44 }}>
            <Icon size={22} />
          </Avatar>
          <Box minWidth={0}>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.2rem", sm: undefined }, whiteSpace: "nowrap" }}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div">
              {helper}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
      </CardActionArea>
    </Card>
  );
}

function ActionRow({ alert, openLabel }: { alert: AdminAlert; openLabel: string }) {
  const Icon = alert.severity === "info" ? IconInfoCircle : IconAlertTriangle;
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Avatar
        sx={{
          width: 36,
          height: 36,
          bgcolor: `${severityColor[alert.severity]}.light`,
          color: `${severityColor[alert.severity]}.main`,
        }}
      >
        <Icon size={18} />
      </Avatar>
      <Box flexGrow={1} minWidth={0}>
        <Typography variant="body2" fontWeight={600}>
          {alert.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p">
          {alert.detail}
        </Typography>
      </Box>
      {alert.href ? (
        <LinkButton href={alert.href} size="small" variant="text" endIcon={<IconArrowRight size={14} />}>
          {openLabel}
        </LinkButton>
      ) : null}
    </Stack>
  );
}

export function ExecutiveOverview({ firstName, timeZone, home }: ExecutiveOverviewProps) {
  const t = useTranslations("admin.home");
  const tAdmin = useTranslations("admin");
  const format = useFormatter();
  const theme = useTheme();
  const { actions, business, days, growth, operations, health, activity } = home;

  const usd = (cents: number, whole = false) =>
    format.number((whole ? Math.round(cents / 100) : cents / 100), {
      style: "currency",
      currency: "USD",
      ...(whole ? { maximumFractionDigits: 0 } : {}),
    });
  const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);
  const change = business.revenueLastMonthCents
    ? Math.round(((business.revenueThisMonthCents - business.revenueLastMonthCents) / business.revenueLastMonthCents) * 100)
    : null;
  const marginPct = percent(business.marginCents, business.revenueThisMonthCents);

  const dayLabels = days.map((day) =>
    format.dateTime(new Date(`${day.date}T12:00:00Z`), { day: "numeric", month: "short", timeZone: "UTC" }),
  );
  const classesHeld = days.reduce((sum, day) => sum + day.classes, 0);
  const classesCanceled = days.reduce((sum, day) => sum + day.canceled, 0);
  const cancelRate = percent(classesCanceled, classesHeld + classesCanceled);

  const healthy = health.integrations.filter((item) => item.status === "connected").length;

  return (
    <Box>
      <Breadcrumb title={t("title", { firstName })} subtitle={t("subtitle")} />

      <Grid container spacing={3}>
        {/* Needs your action */}
        <Grid size={12}>
          {actions.length ? (
            <SectionCard
              title={t("actionsTitle")}
              subtitle={t("actionsSubtitle", { count: actions.length })}
              action={
                <Chip
                  size="small"
                  color={actions.some((alert) => alert.severity === "critical") ? "error" : "warning"}
                  label={t("actionsCount", { count: actions.length })}
                />
              }
            >
              <Stack spacing={1.75}>
                {actions.map((alert) => (
                  <ActionRow key={alert.id} alert={alert} openLabel={t("open")} />
                ))}
              </Stack>
            </SectionCard>
          ) : (
            <Card elevation={9}>
              <CardContent sx={{ p: "20px 24px" }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <IconCircleCheck size={22} color={theme.palette.success.main} />
                  <Typography fontWeight={600}>{t("allClear")}</Typography>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* The business this month */}
        <Grid size={{ xs: 6, lg: 3 }}>
          <Tile
            label={t("tile.revenue")}
            value={usd(business.revenueThisMonthCents, true)}
            helper={
              change === null ? (
                t("tile.revenueNoCompare")
              ) : (
                <Box component="span" sx={{ color: change >= 0 ? "success.main" : "error.main" }}>
                  {t("tile.revenueChange", { percent: `${change >= 0 ? "+" : ""}${change}` })}
                </Box>
              )
            }
            icon={IconCoins}
            color="success"
            href="/admin/finance/ledger"
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <Tile
            label={t("tile.margin")}
            value={usd(business.marginCents, true)}
            helper={t("tile.marginHelper", { percent: marginPct })}
            icon={IconChartLine}
            color={business.marginCents >= 0 ? "primary" : "error"}
            href="/admin/finance/ledger"
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <Tile
            label={t("tile.deferred")}
            value={usd(business.deferredCents, true)}
            helper={t("tile.deferredHelper", { count: business.creditsOutstanding })}
            icon={IconBuildingBank}
            color="warning"
            href="/admin/finance/ledger"
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <Tile
            label={t("tile.paying")}
            value={`${business.payingStudents}`}
            helper={t("tile.payingHelper", { count: business.firstTimeBuyers })}
            icon={IconUsers}
            color="secondary"
            href="/admin/organization/students"
          />
        </Grid>

        {/* 30 days */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard
            title={t("chartTitle")}
            subtitle={t("chartSubtitle", { zone: timeZone.replace(/_/g, " ") })}
            action={
              <LinkButton size="small" href="/admin/finance/ledger" endIcon={<IconArrowRight size={14} />}>
                {t("ledger")}
              </LinkButton>
            }
          >
            <ApexChart
              type="area"
              height={260}
              series={[
                { name: t("series.revenue"), data: days.map((day) => day.revenueCents / 100) },
                { name: t("series.teacher"), data: days.map((day) => day.teacherCents / 100) },
                { name: t("series.ai"), data: days.map((day) => day.aiCents / 100) },
              ]}
              options={{
                chart: { toolbar: { show: false }, fontFamily: theme.typography.fontFamily, foreColor: "#adb0bb", stacked: false },
                colors: [theme.palette.success.main, theme.palette.primary.main, theme.palette.secondary.main],
                dataLabels: { enabled: false },
                stroke: { curve: "smooth", width: 2 },
                fill: { type: "gradient", gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
                grid: { strokeDashArray: 3 },
                legend: { position: "top", horizontalAlign: "left" },
                xaxis: { categories: dayLabels, tickAmount: 6, labels: { rotate: 0, style: { fontSize: "11px" } } },
                yaxis: { labels: { formatter: (value: number) => `$${Math.round(value)}` } },
                tooltip: { y: { formatter: (value: number) => usd(Math.round(value * 100)) } },
              }}
            />
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">{t("classesTitle")}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t("classesSummary", { held: classesHeld, canceled: classesCanceled, rate: cancelRate })}
              </Typography>
            </Stack>
            <ApexChart
              type="bar"
              height={140}
              series={[
                { name: t("series.classes"), data: days.map((day) => day.classes) },
                { name: t("series.canceled"), data: days.map((day) => day.canceled) },
              ]}
              options={{
                chart: { toolbar: { show: false }, stacked: true, fontFamily: theme.typography.fontFamily, foreColor: "#adb0bb" },
                colors: [theme.palette.primary.main, theme.palette.error.main],
                plotOptions: { bar: { borderRadius: 2, columnWidth: "60%" } },
                dataLabels: { enabled: false },
                legend: { show: false },
                grid: { strokeDashArray: 3 },
                xaxis: { categories: dayLabels, labels: { show: false } },
                yaxis: { tickAmount: 2, labels: { formatter: (value: number) => `${Math.round(value)}` } },
              }}
            />
          </SectionCard>
        </Grid>

        {/* Where the money goes this month */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title={t("marginTitle")} subtitle={t("marginSubtitle")}>
            <Stack spacing={1.5}>
              {[
                { key: "revenue", value: business.revenueThisMonthCents, sign: "" },
                { key: "fees", value: business.feeCents, sign: "−" },
                { key: "teacher", value: business.teacherCents, sign: "−" },
                { key: "ai", value: business.aiCents, sign: "−" },
              ].map((row) => (
                <Box key={row.key}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">{t(`margin.${row.key}`)}</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {row.sign}
                      {usd(row.value)}
                    </Typography>
                  </Stack>
                  {row.key !== "revenue" ? (
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, percent(row.value, business.revenueThisMonthCents))}
                      color={row.key === "teacher" ? "primary" : row.key === "ai" ? "secondary" : "inherit"}
                      sx={{ height: 5, borderRadius: 3, mt: 0.5 }}
                    />
                  ) : null}
                </Box>
              ))}
              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">{t("margin.result")}</Typography>
                <Typography variant="h6" fontWeight={700} color={business.marginCents >= 0 ? "success.main" : "error.main"}>
                  {usd(business.marginCents)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {t("margin.note")}
              </Typography>
            </Stack>
          </SectionCard>
        </Grid>

        {/* Growth */}
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionCard
            title={t("growthTitle")}
            action={
              <LinkButton size="small" href="/admin/organization/students" endIcon={<IconArrowRight size={14} />}>
                {t("students")}
              </LinkButton>
            }
          >
            <Stack spacing={1.5}>
              <Row label={t("growth.new")} value={`${growth.newThisMonth}`} note={t("growth.newLastMonth", { count: growth.newLastMonth })} />
              <Row label={t("growth.active")} value={`${growth.active30}`} note={t("growth.activeOf", { total: growth.total })} />
              <Row
                label={t("growth.trials")}
                value={growth.trials ? `${percent(growth.trialsConverted, growth.trials)}%` : "—"}
                note={t("growth.trialsNote", { converted: growth.trialsConverted, trials: growth.trials })}
              />
              <Row label={t("growth.outOfCredits")} value={`${growth.outOfCredits}`} note={t("growth.outOfCreditsNote")} warn={growth.outOfCredits > 0} />
            </Stack>
          </SectionCard>
        </Grid>

        {/* Operations today (the coordinator's day, summarized) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionCard title={t("opsTitle")} subtitle={t("opsSubtitle")}>
            <Stack spacing={1.5}>
              <Row label={t("ops.today")} value={`${operations.today}`} note={t("ops.live", { count: operations.live })} />
              <Row
                label={t("ops.notOpened")}
                value={`${operations.notOpened}`}
                note={t("ops.notOpenedNote")}
                warn={operations.notOpened > 0}
              />
              <Row
                label={t("ops.pending")}
                value={`${operations.coordinatorPending}`}
                note={t("ops.urgent", { count: operations.coordinatorUrgent })}
                warn={operations.coordinatorUrgent > 0}
              />
              <Typography variant="caption" color="text.secondary">
                {t("ops.hint")}
              </Typography>
            </Stack>
          </SectionCard>
        </Grid>

        {/* Platform health */}
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionCard
            title={t("healthTitle")}
            subtitle={t("healthSubtitle", { ok: healthy, total: health.integrations.length })}
            action={
              <LinkButton size="small" href="/admin/platform/integrations" endIcon={<IconArrowRight size={14} />}>
                {t("configure")}
              </LinkButton>
            }
          >
            <Stack spacing={1}>
              {health.integrations.map((item) => (
                <Stack key={item.id} direction="row" spacing={1.25} alignItems="center">
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      flexShrink: 0,
                      bgcolor: item.status === "connected" ? "success.main" : item.status === "action-needed" ? "warning.main" : "error.main",
                    }}
                  />
                  <Typography variant="body2" flexGrow={1} noWrap>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>
                    {t(`integration.${item.status}`)}
                  </Typography>
                </Stack>
              ))}
              <Divider sx={{ my: 0.5 }} />
              <Row label={t("health.security")} value={`${health.securityEvents7d}`} warn={health.securityEvents7d > 0} href="/admin/audit" />
              <Row label={t("health.bounced")} value={`${health.bouncedEmails}`} warn={health.bouncedEmails > 0} href="/admin/platform/email" />
              <Row label={t("health.no2fa")} value={`${health.staffWithout2Fa}`} warn={health.staffWithout2Fa > 0} href="/admin/platform/security" />
            </Stack>
          </SectionCard>
        </Grid>

        {/* Recent activity */}
        <Grid size={12}>
          <SectionCard
            title={t("activityTitle")}
            action={
              <LinkButton size="small" href="/admin/audit" endIcon={<IconArrowRight size={14} />}>
                {t("auditLog")}
              </LinkButton>
            }
          >
            {activity.length ? (
              <Stack spacing={1.25} divider={<Divider flexItem />}>
                {activity.map((entry) => {
                  const key = adminAuditActionKeys[entry.action];
                  return (
                    <Stack key={entry.id} direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.25, sm: 2 }} alignItems={{ sm: "center" }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexGrow={1} minWidth={0}>
                        <IconReceipt2 size={16} />
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {key ? tAdmin(key) : entry.action}
                        </Typography>
                        {entry.severity !== "info" ? (
                          <Chip size="small" color={severityColor[entry.severity]} label={tAdmin(`common.severity.${entry.severity}`)} />
                        ) : null}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {entry.actor} · {entry.at}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            ) : (
              <Typography color="text.secondary">{t("activityEmpty")}</Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}

function Row({
  label,
  value,
  note,
  warn = false,
  href,
}: {
  label: string;
  value: string;
  note?: string;
  warn?: boolean;
  href?: string;
}) {
  const content = (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Box minWidth={0}>
        <Typography variant="body2">{label}</Typography>
        {note ? (
          <Typography variant="caption" color="text.secondary">
            {note}
          </Typography>
        ) : null}
      </Box>
      <Typography variant="h6" fontWeight={700} sx={{ color: warn ? "warning.main" : "text.primary" }}>
        {value}
      </Typography>
    </Stack>
  );
  return href ? (
    <Box component="a" href={href} sx={{ color: "inherit", textDecoration: "none", "&:hover": { opacity: 0.8 } }}>
      {content}
    </Box>
  ) : (
    content
  );
}
