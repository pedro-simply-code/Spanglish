"use client";

import type { ComponentType, ReactNode } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCalendarEvent,
  IconCalendarOff,
  IconCalendarTime,
  IconCash,
  IconClipboardCheck,
  IconCoins,
  IconFileCheck,
  IconSchool,
  IconStarOff,
  IconTrendingDown,
  IconTrendingUp,
  IconUserExclamation,
  IconUsers,
  IconVideo,
  IconVideoOff,
} from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import type { ManagerHome, ManagerPendingItem, ManagerTeamRow } from "@/features/staff/types";

type ManagerOverviewProps = {
  firstName: string;
  timeZone: string;
  now: string;
  home: ManagerHome;
};

const pendingIcons: Record<ManagerPendingItem["kind"], ComponentType<{ size?: number }>> = {
  notOpened: IconVideoOff,
  applications: IconSchool,
  materials: IconFileCheck,
  lowRating: IconStarOff,
  lateGrading: IconClipboardCheck,
  payouts: IconCash,
  changeRequest: IconCalendarTime,
  noAvailability: IconCalendarOff,
  quietStudents: IconUserExclamation,
};

const severityColor = { high: "error", normal: "warning", low: "default" } as const;

const flagColor: Record<ManagerTeamRow["flags"][number], "error" | "warning" | "default"> = {
  noAvailability: "error",
  lowRating: "error",
  toGrade: "warning",
  noUpcoming: "default",
};

export function ManagerOverview({ firstName, timeZone, now, home }: ManagerOverviewProps) {
  const t = useTranslations("educator.manager.dashboard");
  const format = useFormatter();
  const nowMs = new Date(now).getTime();
  const { today, pending, team, students, money } = home;

  const usd = (cents: number) => format.number(cents / 100, { style: "currency", currency: "USD" });
  const time = (iso: string) => format.dateTime(new Date(iso), { hour: "numeric", minute: "2-digit", timeZone });
  const dateTime = (iso: string) =>
    format.dateTime(new Date(iso), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone });

  const live = today.filter((item) => item.live);
  const notOpened = today.filter((item) => item.notOpened);
  const remaining = today.filter((item) => new Date(item.startsAt).getTime() > nowMs);
  const revenueChange = money.revenueLastMonthCents
    ? Math.round(((money.revenueThisMonthCents - money.revenueLastMonthCents) / money.revenueLastMonthCents) * 100)
    : null;

  const pendingLabel = (item: ManagerPendingItem): { title: string; detail?: string } => {
    switch (item.kind) {
      case "notOpened":
        return {
          title: t("pending.notOpened", { topic: item.topic }),
          detail: t("pending.notOpenedDetail", { teacher: item.teacherName, minutes: item.minutes }),
        };
      case "applications":
        return { title: t("pending.applications", { count: item.count }), detail: t("pending.applicationsDetail") };
      case "materials":
        return { title: t("pending.materials", { count: item.count }), detail: t("pending.materialsDetail") };
      case "lowRating":
        return {
          title: t("pending.lowRating", { stars: item.stars, teacher: item.teacherName }),
          detail: item.comment
            ? t("pending.lowRatingComment", { student: item.studentName, comment: item.comment })
            : t("pending.lowRatingDetail", { student: item.studentName }),
        };
      case "lateGrading":
        return {
          title: t("pending.lateGrading", { teacher: item.teacherName, count: item.count }),
          detail: t("pending.lateGradingDetail"),
        };
      case "payouts":
        return {
          title: t("pending.payouts", { amount: usd(item.amountCents) }),
          detail: t("pending.payoutsDetail", { count: item.teachers }),
        };
      case "changeRequest":
        return {
          title: t("pending.changeRequest", { topic: item.topic }),
          detail: t("pending.changeRequestDetail", { date: dateTime(item.newStartsAt) }),
        };
      case "noAvailability":
        return { title: t("pending.noAvailability", { count: item.count }), detail: t("pending.noAvailabilityDetail") };
      case "quietStudents":
        return { title: t("pending.quietStudents", { count: item.count }), detail: t("pending.quietStudentsDetail") };
    }
  };

  const stats: { key: string; value: string; helper: ReactNode; icon: ComponentType<{ size?: number }>; color: string; href: string }[] = [
    {
      key: "revenue",
      // Whole dollars so it fits a half-width card on phones.
      value: format.number(Math.round(money.revenueThisMonthCents / 100), { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
      helper:
        revenueChange === null ? (
          t("stat.revenueHelper", { count: money.ordersThisMonth })
        ) : (
          <Box component="span" sx={{ color: revenueChange >= 0 ? "success.main" : "error.main", display: "inline-flex", alignItems: "center", gap: 0.5 }}>
            {revenueChange >= 0 ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
            {t("stat.revenueChange", { percent: `${revenueChange >= 0 ? "+" : ""}${revenueChange}` })}
          </Box>
        ),
      icon: IconCoins,
      color: "success",
      href: "/manager/billing",
    },
    {
      key: "week",
      value: `${home.classesThisWeek}`,
      helper: t("stat.weekHelper", { count: today.length }),
      icon: IconCalendarEvent,
      color: "primary",
      href: "/apps/calendar",
    },
    {
      key: "active",
      value: `${students.active30}`,
      helper: t("stat.activeHelper", { total: students.total }),
      icon: IconUsers,
      color: "secondary",
      href: "/manager/students",
    },
    {
      key: "credits",
      value: `${money.creditsOutstanding}`,
      helper: t("stat.creditsHelper"),
      icon: IconCash,
      color: "warning",
      href: "/manager/students",
    },
  ];

  const studentRows = [
    { key: "newThisWeek", value: students.newThisWeek },
    { key: "active30", value: students.active30 },
    { key: "outOfCredits", value: students.outOfCredits, tone: "warning.main" },
    { key: "idleWithCredits", value: students.idleWithCredits, tone: "warning.main" },
    { key: "trialsNoPurchase", value: students.trialsNoPurchase, tone: "warning.main" },
  ] as const;

  const moneyRows = [
    { key: "revenueThisMonth", value: usd(money.revenueThisMonthCents) },
    { key: "revenueLastMonth", value: usd(money.revenueLastMonthCents) },
    { key: "ordersThisMonth", value: `${money.ordersThisMonth}` },
    { key: "teacherEarned", value: usd(money.teacherEarnedThisMonthCents) },
    {
      key: "unbatched",
      value: usd(money.teacherUnbatchedCents),
      note: money.unbatchedTeachers ? t("money.unbatchedTeachers", { count: money.unbatchedTeachers }) : null,
    },
  ] as const;

  return (
    <Box>
      <Breadcrumb title={t("title", { firstName })} subtitle={t("subtitle")} />

      <Grid container spacing={3}>
        {/* Today in the academy */}
        <Grid size={12}>
          <Card elevation={9} sx={{ background: "linear-gradient(120deg, #FFFFFF 0%, #FBF2EF 100%)" }}>
            <CardContent sx={{ p: { xs: "24px", md: "35px" } }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ md: "center" }}
                mb={2.5}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ width: 52, height: 52, bgcolor: notOpened.length ? "error.main" : "primary.main", color: "#fff" }}>
                    {notOpened.length ? <IconAlertTriangle size={26} /> : <IconVideo size={26} />}
                  </Avatar>
                  <Box>
                    <Typography variant="h5">{t("todayTitle")}</Typography>
                    <Stack direction="row" spacing={1} mt={0.75} flexWrap="wrap" useFlexGap>
                      <Chip size="small" color={live.length ? "error" : "default"} variant={live.length ? "filled" : "outlined"} label={t("liveCount", { count: live.length })} />
                      <Chip size="small" variant="outlined" label={t("todayCount", { count: today.length })} />
                      <Chip size="small" variant="outlined" label={t("remainingCount", { count: remaining.length })} />
                      {notOpened.length ? (
                        <Chip size="small" color="error" icon={<IconVideoOff size={14} />} label={t("notOpenedCount", { count: notOpened.length })} />
                      ) : null}
                    </Stack>
                  </Box>
                </Stack>
                <LinkButton href="/apps/calendar" variant="contained" startIcon={<IconCalendarEvent size={18} />}>
                  {t("openCalendar")}
                </LinkButton>
              </Stack>

              {today.length ? (
                <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                  {today.slice(0, 6).map((item, index) => {
                    const ended = new Date(item.endsAt).getTime() <= nowMs;
                    return (
                      <Stack
                        key={item.id}
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        sx={{
                          px: { xs: 1.5, sm: 2 },
                          py: 1.5,
                          borderTop: index ? "1px solid" : "none",
                          borderColor: "divider",
                          bgcolor: item.notOpened ? "error.light" : "transparent",
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={700} sx={{ width: { xs: 48, sm: 72 }, flexShrink: 0 }}>
                          {time(item.startsAt)}
                        </Typography>
                        <Box flexGrow={1} minWidth={0}>
                          <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {item.topic}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {item.teacherName}
                            {item.students.length ? ` · ${item.students.join(", ")}` : ""}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          color={item.notOpened ? "error" : item.live ? "success" : "default"}
                          variant={item.notOpened || item.live ? "filled" : "outlined"}
                          label={t(item.notOpened ? "status.notOpened" : item.live ? "status.live" : ended ? "status.ended" : "status.upcoming")}
                        />
                        <LinkButton href={`/classes/${item.id}`} size="small" variant="text" sx={{ display: { xs: "none", sm: "inline-flex" } }}>
                          {t("view")}
                        </LinkButton>
                      </Stack>
                    );
                  })}
                  {today.length > 6 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                      {t("moreToday", { count: today.length - 6 })}
                    </Typography>
                  ) : null}
                </Box>
              ) : (
                <Typography color="text.secondary">{t("noClassesToday")}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Grid key={stat.key} size={{ xs: 6, lg: 3 }}>
              <Card elevation={9} sx={{ height: "100%" }}>
                <CardContent sx={{ p: { xs: "16px", sm: "24px" } }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }} alignItems={{ sm: "center" }}>
                    <Avatar sx={{ bgcolor: `${stat.color}.light`, color: `${stat.color}.main`, width: 44, height: 44 }}>
                      <Icon size={22} />
                    </Avatar>
                    <Box minWidth={0}>
                      <Typography variant="body2" color="text.secondary">
                        {t(`stat.${stat.key}`)}
                      </Typography>
                      <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.2rem", sm: undefined }, whiteSpace: "nowrap" }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="div">
                        {stat.helper}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title={t("pendingTitle")} subtitle={t("pendingSubtitle")}>
            {pending.length ? (
              <Stack spacing={1.75}>
                {pending.map((item) => {
                  const Icon = pendingIcons[item.kind];
                  const label = pendingLabel(item);
                  return (
                    <Stack key={item.id} direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: item.severity === "high" ? "error.light" : item.severity === "normal" ? "warning.light" : "grey.100",
                          color: item.severity === "high" ? "error.main" : item.severity === "normal" ? "warning.main" : "text.primary",
                        }}
                      >
                        <Icon size={18} />
                      </Avatar>
                      <Box flexGrow={1} minWidth={0}>
                        <Typography variant="body2" fontWeight={600}>
                          {label.title}
                        </Typography>
                        {label.detail ? (
                          <Typography variant="caption" color="text.secondary" component="p">
                            {label.detail}
                          </Typography>
                        ) : null}
                      </Box>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={severityColor[item.severity]}
                        label={t(`severity.${item.severity}`)}
                        sx={{ display: { xs: "none", sm: "inline-flex" } }}
                      />
                      <LinkButton href={item.href} size="small" variant="text" endIcon={<IconArrowRight size={14} />}>
                        {t("go")}
                      </LinkButton>
                    </Stack>
                  );
                })}
              </Stack>
            ) : (
              <Typography color="text.secondary">{t("allDone")}</Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard
            title={t("teamTitle")}
            subtitle={t("teamSubtitle", { count: home.teacherCount })}
            action={
              <LinkButton size="small" href="/manager/staff" endIcon={<IconArrowRight size={14} />}>
                {t("staff")}
              </LinkButton>
            }
          >
            <Stack spacing={1.5} divider={<Divider flexItem />}>
              {!team.length ? (
                <Typography variant="body2" color="text.secondary">
                  {t("noTeachers")}
                </Typography>
              ) : null}
              {team.map((teacher) => (
                <Stack key={teacher.id} direction="row" spacing={1.5} alignItems="center">
                  <Avatar src={teacher.image ?? undefined} alt={teacher.name} sx={{ width: 38, height: 38 }}>
                    {teacher.name.charAt(0)}
                  </Avatar>
                  <Box flexGrow={1} minWidth={0}>
                    <Typography variant="subtitle2" fontWeight={600} noWrap>
                      {teacher.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="p">
                      {teacher.levelName} ·{" "}
                      {teacher.ratingCount ? `${teacher.ratingAverage.toFixed(1)} ★` : t("noRatings")} ·{" "}
                      {t("teacherLine", { upcoming: teacher.upcoming, taught: teacher.classesTaught })}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="flex-end" sx={{ maxWidth: { xs: 130, sm: 260 } }}>
                    {teacher.flags.length ? (
                      teacher.flags.map((flag) => (
                        <Chip
                          key={flag}
                          size="small"
                          variant="outlined"
                          color={flagColor[flag]}
                          label={t(`flag.${flag}`, { count: teacher.toGrade })}
                        />
                      ))
                    ) : (
                      <Chip size="small" color="success" variant="outlined" label={t("flag.ok")} />
                    )}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard
            title={t("studentsTitle")}
            subtitle={t("studentsSubtitle", { total: students.total })}
            action={
              <LinkButton size="small" href="/manager/students" endIcon={<IconArrowRight size={14} />}>
                {t("studentsLink")}
              </LinkButton>
            }
          >
            <Stack spacing={1.5}>
              {studentRows.map((row) => (
                <Stack key={row.key} direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <Box minWidth={0}>
                    <Typography variant="body2">{t(`students.${row.key}`)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t(`students.${row.key}Hint`)}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ color: "tone" in row && row.value ? row.tone : "text.primary" }}
                  >
                    {row.value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title={t("moneyTitle")} subtitle={t("moneySubtitle")}>
            <Stack spacing={1.5}>
              {moneyRows.map((row) => (
                <Stack key={row.key} direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <Box minWidth={0}>
                    <Typography variant="body2">{t(`money.${row.key}`)}</Typography>
                    {"note" in row && row.note ? (
                      <Typography variant="caption" color="text.secondary">
                        {row.note}
                      </Typography>
                    ) : null}
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {row.value}
                  </Typography>
                </Stack>
              ))}
              <Divider />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <LinkButton href="/manager/billing" size="small" variant="outlined">
                  {t("billing")}
                </LinkButton>
                <LinkButton href="/manager/payouts" size="small" variant="text" endIcon={<IconArrowRight size={14} />}>
                  {t("preparePayouts")}
                </LinkButton>
              </Stack>
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
