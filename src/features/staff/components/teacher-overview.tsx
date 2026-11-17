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
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { ClassStatusChip } from "@/features/classes/components/class-status-chip";
import type { LiveClass } from "@/features/classes/types";
import {
  formatClassDateShort,
  formatClassTimeRange,
  formatClassType,
} from "@/features/classes/format";
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

const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

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

  const stats = [
    {
      id: "today",
      label: "Classes today",
      value: `${todayCount}`,
      helper: "Eastern Time",
      icon: IconCalendarEvent,
      color: "primary",
    },
    {
      id: "upcoming",
      label: "Upcoming classes",
      value: `${upcoming.length}`,
      helper: "Next seven days",
      icon: IconVideo,
      color: "success",
    },
    {
      id: "earnings",
      label: "Earned this month",
      value: usd(extras.earnedThisMonthCents),
      helper: `${usd(extras.unpaidCents)} not paid yet`,
      icon: IconCash,
      color: "secondary",
    },
    {
      id: "rating",
      label: "Teacher rating",
      value: extras.ratingCount ? extras.ratingAverage.toFixed(1) : "—",
      helper: extras.ratingCount ? `${extras.ratingCount} ratings` : "No ratings yet",
      icon: IconStar,
      color: "warning",
    },
  ] as const;

  return (
    <Box mt={3}>
      <Breadcrumb
        title={`Good morning, ${firstName}`}
        subtitle="Here is your teaching rhythm for today. Student dashboards are paused while the Teacher dashboard is active."
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
            title="Your next live classes"
            subtitle="Roster, time, and room status"
            action={
              <LinkButton
                size="small"
                href="/classes"
                endIcon={<IconArrowRight size={14} />}
              >
                All classes
              </LinkButton>
            }
          >
            <Stack spacing={2}>
              {upcoming.map((item) => {
                const status = getClassStatus(item, now);

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
                      alt={item.topic}
                      variant="rounded"
                      sx={{ width: 44, height: 44 }}
                    />
                    <Box flexGrow={1} minWidth={0}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <ClassStatusChip status={status} />
                        <Chip
                          label={`${item.duration} min`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="subtitle1" fontWeight={600} mt={0.5}>
                        {item.topic}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatClassDateShort(item.startsAt)} ·{" "}
                        {formatClassTimeRange(item)} · {formatClassType(item.type)}
                      </Typography>
                    </Box>
                    <LinkButton
                      href={`/classes/${item.id}`}
                      size="small"
                      variant="outlined"
                    >
                      Open
                    </LinkButton>
                  </Stack>
                );
              })}
              {!upcoming.length ? (
                <Typography variant="body2" color="text.secondary">
                  No live classes scheduled. Keep your availability up to date so students can book you.
                </Typography>
              ) : null}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard
            title={extras.levelName}
            subtitle={`Teacher share: ${extras.levelPercent}% of each credit · ${extras.classesTaught} classes taught`}
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
                  Next: {extras.nextLevel.name} —{" "}
                  {[
                    extras.nextLevel.classes ? `${extras.nextLevel.classes} more classes` : null,
                    extras.nextLevel.ratings ? `${extras.nextLevel.ratings} more ratings` : null,
                    `an average of ${extras.nextLevel.rating}★`,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  .
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  You are at the top level.
                </Typography>
              )}
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {extras.badges.length ? (
                  extras.badges.map((badge) => (
                    <Chip key={badge.id} label={badge.label} title={badge.description} color="success" size="small" />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Badges appear as you teach and collect ratings.
                  </Typography>
                )}
              </Stack>
              <Divider />
              <Typography variant="subtitle2">Latest ratings</Typography>
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
                  No ratings yet.
                </Typography>
              )}
              <LinkButton size="small" href="/teacher/earnings" endIcon={<IconArrowRight size={14} />}>
                Earnings
              </LinkButton>
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={12}>
          <SectionCard
            title="Student roster"
            subtitle="Students from your classes"
            action={<Chip label={`${roster.length} students`} size="small" variant="outlined" />}
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
                          {student.classes} class{student.classes === 1 ? "" : "es"} with you
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Next: {student.next ? formatClassDateShort(student.next) : "not booked"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last: {student.last ? formatClassDateShort(student.last) : "—"}
                    </Typography>
                  </Box>
                </Grid>
              ))}
              {!roster.length ? (
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">
                    Students appear here once they book a class with you.
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
