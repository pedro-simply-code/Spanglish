"use client";

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
  IconArrowRight,
  IconCalendarEvent,
  IconCash,
  IconChecklist,
  IconStar,
  IconVideo,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import type { LiveClass, LiveClassStatus } from "@/features/classes/types";
import { localizeDemoClassTopic } from "@/features/materials/data";
import { classTimeZone } from "@/lib/class-policy";
import { getClassStatus } from "@/features/classes/policy";
import { countClassesToday } from "@/features/staff/data";

/** Earnings, rating and level, computed on the server. */
export type TeacherOverviewExtras = {
  earnedThisMonthCents: number;
  unpaidCents: number;
  classesTaught: number;
  ratingAverage: number;
  ratingCount: number;
  levelName: string;
  levelPercent: number;
  nextLevel: { name: string; classes: number; ratings: number; rating: number } | null;
  badges: { id: string; label: string; description: string }[];
  recentRatings: { stars: number; comment: string | null; studentName: string; createdAt: string }[];
};

type TeacherOverviewProps = {
  firstName: string;
  ownClasses: LiveClass[];
  now: string;
  extras: TeacherOverviewExtras;
};

const classStatusMeta: Record<
  LiveClassStatus,
  { color: "primary" | "success" | "default" | "error"; labelKey: string }
> = {
  upcoming: { color: "primary", labelKey: "status.upcoming" },
  "in-progress": { color: "success", labelKey: "status.inProgress" },
  completed: { color: "default", labelKey: "status.completed" },
  canceled: { color: "error", labelKey: "status.canceled" },
};

/** Students from the teacher's classes, with the next and last class. */
function rosterFrom(classes: LiveClass[], now: string) {
  const nowMs = new Date(now).getTime();
  const roster = new Map<string, { id: string; name: string; classes: number; next?: string; last?: string }>();
  for (const item of classes) {
    if (item.statusOverride === "canceled") continue;
    for (const person of item.participants ?? []) {
      const entry = roster.get(person.userId) ?? { id: person.userId, name: person.name, classes: 0 };
      const starts = new Date(item.startsAt).getTime();
      if (starts > nowMs) {
        if (!entry.next || starts < new Date(entry.next).getTime()) entry.next = item.startsAt;
      } else {
        entry.classes += 1;
        if (!entry.last || starts > new Date(entry.last).getTime()) entry.last = item.startsAt;
      }
      roster.set(person.userId, entry);
    }
  }
  return [...roster.values()].sort((a, b) => b.classes - a.classes);
}

export function TeacherOverview({
  firstName,
  ownClasses,
  now,
  extras,
}: TeacherOverviewProps) {
  const t = useTranslations("educator");
  const locale = useLocale();
  const roster = rosterFrom(ownClasses, now);
  const todayCount = countClassesToday(ownClasses, now);
  const upcoming = ownClasses
    .filter((item) => {
      const status = getClassStatus(item, now);
      return status === "upcoming" || status === "in-progress";
    })
    .sort(
      (first, second) =>
        new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
    );

  const money = (cents: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(cents / 100);
  const shortDate = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: classTimeZone,
  });
  const timeOfDay = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: classTimeZone,
  });
  const formatTimeRange = (item: LiveClass) => {
    const start = new Date(item.startsAt).getTime();
    const end = new Date(start + item.duration * 60_000).toISOString();
    return `${timeOfDay.format(new Date(item.startsAt))} – ${timeOfDay.format(new Date(end))}`;
  };
  const classTypeLabel = (type: LiveClass["type"]) =>
    t(type === "paired" ? "classType.paired" : "classType.individual");
  const classTopic = (item: LiveClass) =>
    localizeDemoClassTopic(item.id, item.topic, (key) => t(`materials.${key}`));

  const stats = [
    {
      id: "today",
      label: t("teacher.dashboard.classesToday"),
      value: `${todayCount}`,
      helper: t("teacher.dashboard.easternTime"),
      icon: IconCalendarEvent,
      color: "primary",
    },
    {
      id: "upcoming",
      label: t("teacher.dashboard.upcomingClasses"),
      value: `${upcoming.length}`,
      helper: t("teacher.dashboard.nextSevenDays"),
      icon: IconVideo,
      color: "success",
    },
    {
      id: "earnings",
      label: t("teacher.dashboard.earnedThisMonth"),
      value: money(extras.earnedThisMonthCents),
      helper: t("teacher.dashboard.notPaidYet", { amount: money(extras.unpaidCents) }),
      icon: IconCash,
      color: "secondary",
    },
    {
      id: "rating",
      label: t("teacher.dashboard.teacherRating"),
      value: extras.ratingCount ? extras.ratingAverage.toFixed(1) : "—",
      helper: extras.ratingCount
        ? t("teacher.dashboard.ratings", { count: extras.ratingCount })
        : t("teacher.dashboard.noRatingsYet"),
      icon: IconStar,
      color: "warning",
    },
  ] as const;

  const nextLevelDetails = extras.nextLevel
    ? [
        extras.nextLevel.classes
          ? t("teacher.dashboard.moreClasses", { count: extras.nextLevel.classes })
          : null,
        extras.nextLevel.ratings
          ? t("teacher.dashboard.moreRatings", { count: extras.nextLevel.ratings })
          : null,
        t("teacher.dashboard.averageRating", { rating: extras.nextLevel.rating }),
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("teacher.dashboard.greeting", { firstName })}
        subtitle={t("teacher.dashboard.subtitle")}
      />

      <Grid container spacing={3}>
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Grid key={stat.id} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card elevation={9} sx={{ height: "100%" }}>
                <CardContent sx={{ p: "30px" }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: `${stat.color}.light`,
                        color: `${stat.color}.main`,
                      }}
                    >
                      <Icon size={24} />
                    </Avatar>
                    <Box minWidth={0}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {stat.label}
                      </Typography>
                      <Typography
                        variant="h4"
                        fontWeight={700}
                        color={`${stat.color}.main`}
                      >
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.helper}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard
            title={t("teacher.dashboard.nextLiveClasses")}
            subtitle={t("teacher.dashboard.rosterTimeRoom")}
            action={
              <LinkButton
                size="small"
                href="/classes"
                endIcon={<IconArrowRight size={14} />}
              >
                {t("teacher.dashboard.allClasses")}
              </LinkButton>
            }
          >
            <Stack spacing={2}>
              {upcoming.map((item) => {
                const status = getClassStatus(item, now);
                const statusMeta = classStatusMeta[status];

                return (
                  <Stack
                    key={item.id}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    sx={{ p: 2, bgcolor: "grey.100" }}
                  >
                    <Avatar
                      src={item.teacherAvatar}
                      alt={classTopic(item)}
                      variant="rounded"
                      sx={{ width: 44, height: 44 }}
                    />
                    <Box flexGrow={1} minWidth={0}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip
                          label={t(statusMeta.labelKey)}
                          color={statusMeta.color}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={t("teacher.dashboard.minutes", { count: item.duration })}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="subtitle1" fontWeight={600} mt={0.5}>
                        {classTopic(item)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {shortDate.format(new Date(item.startsAt))} ·{" "}
                        {formatTimeRange(item)} · {classTypeLabel(item.type)}
                      </Typography>
                    </Box>
                    <LinkButton
                      href={`/classes/${item.id}`}
                      size="small"
                      variant="outlined"
                    >
                      {t("teacher.dashboard.open")}
                    </LinkButton>
                  </Stack>
                );
              })}
              {!upcoming.length ? (
                <Typography variant="body2" color="text.secondary">
                  {t("teacher.dashboard.noClassesScheduled")}
                </Typography>
              ) : null}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard
            title={extras.levelName}
            subtitle={t("teacher.dashboard.teacherShare", {
              percent: extras.levelPercent,
              count: extras.classesTaught,
            })}
            action={
              <Avatar
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: "warning.light",
                  color: "warning.main",
                }}
              >
                <IconChecklist size={20} />
              </Avatar>
            }
          >
            <Stack spacing={2}>
              {extras.nextLevel ? (
                <Typography variant="body2" color="text.secondary" data-testid="next-level">
                  {t("teacher.dashboard.nextLevel", {
                    name: extras.nextLevel.name,
                    details: nextLevelDetails,
                  })}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t("teacher.dashboard.topLevel")}
                </Typography>
              )}
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {extras.badges.length ? (
                  extras.badges.map((badge) => (
                    <Chip key={badge.id} label={badge.label} title={badge.description} color="success" size="small" />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t("teacher.dashboard.badgesAppear")}
                  </Typography>
                )}
              </Stack>
              <Divider />
              <Typography variant="subtitle2">{t("teacher.dashboard.latestRatings")}</Typography>
              {extras.recentRatings.length ? (
                extras.recentRatings.map((rating, index) => (
                  <Box key={`${rating.createdAt}-${index}`}>
                    <Typography variant="body2" fontWeight={600}>
                      {"★".repeat(rating.stars)}
                      {"☆".repeat(5 - rating.stars)} · {rating.studentName}
                    </Typography>
                    {rating.comment ? (
                      <Typography variant="body2" color="text.secondary">
                        “{rating.comment}”
                      </Typography>
                    ) : null}
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t("teacher.dashboard.noRatingsYet")}
                </Typography>
              )}
              <LinkButton size="small" href="/teacher/earnings" endIcon={<IconArrowRight size={14} />}>
                {t("common.earnings")}
              </LinkButton>
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={12}>
          <SectionCard
            title={t("teacher.dashboard.studentRoster")}
            subtitle={t("teacher.dashboard.studentsFromClasses")}
            action={<Chip label={t("teacher.dashboard.studentsCount", { count: roster.length })} size="small" variant="outlined" />}
          >
            <Grid container spacing={3}>
              {roster.map((student) => (
                <Grid key={student.id} size={{ xs: 12, sm: 6, lg: 3 }}>
                  <Box sx={{ p: 2, bgcolor: "grey.100", height: "100%" }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                      <Avatar sx={{ width: 40, height: 40 }}>{student.name.charAt(0)}</Avatar>
                      <Box minWidth={0}>
                        <Typography variant="subtitle1" fontWeight={600} noWrap>
                          {student.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t("teacher.dashboard.classesWithYou", {
                            count: student.classes,
                            plural: student.classes === 1 ? "" : locale === "es" ? "s" : "es",
                          })}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {t("teacher.dashboard.next", {
                        value: student.next ? shortDate.format(new Date(student.next)) : t("teacher.dashboard.notBooked"),
                      })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("teacher.dashboard.last", {
                        value: student.last ? shortDate.format(new Date(student.last)) : "—",
                      })}
                    </Typography>
                  </Box>
                </Grid>
              ))}
              {!roster.length ? (
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">
                    {t("teacher.dashboard.studentsAppear")}
                  </Typography>
                </Grid>
              ) : null}
            </Grid>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
