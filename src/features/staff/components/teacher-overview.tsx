"use client";

import type { ComponentType } from "react";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
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
  IconCalendarTime,
  IconCash,
  IconChecklist,
  IconClipboardCheck,
  IconClock,
  IconFileAlert,
  IconFlame,
  IconNotebook,
  IconSchool,
  IconShieldLock,
  IconSparkles,
  IconStar,
  IconUserCircle,
  IconUserExclamation,
  IconVideo,
} from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import type { LiveClass } from "@/features/classes/types";
import { localizeDemoClassTopic } from "@/features/materials/data";

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

/** Work waiting for the teacher and what happened lately (server). */
export type TeacherOverviewHome = {
  toGrade: number;
  rejectedMaterials: { id: string; title: string }[];
  hasAvailability: boolean;
  lastClass: {
    id: string;
    topic: string;
    startsAt: string;
    students: string[];
    recap: string | null;
    summary: string | null;
  } | null;
  practice: {
    id: string;
    studentName: string;
    materialId: string;
    materialTitle: string;
    percent: number;
    xp: number;
    createdAt: string;
  }[];
};

/** Upcoming or live classes with the classroom state already worked out. */
export type TeacherOverviewClass = LiveClass & { canJoin: boolean; live: boolean };

type TeacherOverviewProps = {
  firstName: string;
  timeZone: string;
  now: string;
  /** Upcoming and live classes, soonest first. */
  upcoming: TeacherOverviewClass[];
  /** Every class (for today's count and the student list). */
  ownClasses: LiveClass[];
  extras: TeacherOverviewExtras;
  home: TeacherOverviewHome;
  /** One profile nudge at the end of the to-do list. */
  profileReminder: "photo" | "twoFactor" | null;
};

const DAY = 24 * 60 * 60 * 1000;
const INACTIVE_DAYS = 14;

/** Students who had classes with the teacher but have nothing booked for a while. */
function quietStudents(classes: LiveClass[], nowMs: number) {
  const byStudent = new Map<string, { id: string; name: string; last: number; next: boolean }>();
  for (const item of classes) {
    if (item.statusOverride === "canceled") continue;
    const starts = new Date(item.startsAt).getTime();
    for (const person of item.participants ?? []) {
      const entry = byStudent.get(person.userId) ?? { id: person.userId, name: person.name, last: 0, next: false };
      if (starts > nowMs) entry.next = true;
      else entry.last = Math.max(entry.last, starts);
      byStudent.set(person.userId, entry);
    }
  }
  return [...byStudent.values()]
    .filter((entry) => !entry.next && entry.last && nowMs - entry.last > INACTIVE_DAYS * DAY)
    .sort((a, b) => b.last - a.last);
}

/** The calendar day (YYYY-MM-DD) of a moment in a time zone. */
function dayIn(iso: string | number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

export function TeacherOverview({
  firstName,
  timeZone,
  now,
  upcoming,
  ownClasses,
  extras,
  home,
  profileReminder,
}: TeacherOverviewProps) {
  const t = useTranslations("educator");
  const td = useTranslations("educator.teacher.dashboard");
  const format = useFormatter();
  const nowMs = new Date(now).getTime();

  const date = (iso: string) =>
    format.dateTime(new Date(iso), { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone });
  const shortDate = (iso: string) =>
    format.dateTime(new Date(iso), { weekday: "short", day: "numeric", month: "short", timeZone });
  const time = (iso: string) => format.dateTime(new Date(iso), { hour: "numeric", minute: "2-digit", timeZone });
  const money = (cents: number) => format.number(cents / 100, { style: "currency", currency: "USD" });
  const topic = (item: LiveClass) => localizeDemoClassTopic(item.id, item.topic, (key) => t(`materials.${key}`));
  const students = (item: LiveClass) => (item.participants ?? []).map((person) => person.name);
  const typeLabel = (item: LiveClass) => t(item.type === "paired" ? "classType.paired" : "classType.individual");

  const today = dayIn(nowMs, timeZone);
  const todayCount = ownClasses.filter(
    (item) => item.statusOverride !== "canceled" && dayIn(item.startsAt, timeZone) === today,
  ).length;
  const weekCount = upcoming.filter((item) => new Date(item.startsAt).getTime() - nowMs <= 7 * DAY).length;
  const next = upcoming[0] ?? null;
  const quiet = quietStudents(ownClasses, nowMs);

  /* --- To-do --- */
  const todo: { key: string; label: string; href: string; icon: ComponentType<{ size?: number }>; urgent?: boolean }[] = [];
  if (next?.live) {
    todo.push({ key: "join", label: td("todo.join", { topic: topic(next) }), href: `/classes/${next.id}/room`, icon: IconVideo, urgent: true });
  }
  if (home.toGrade) {
    todo.push({ key: "grade", label: td("todo.grade", { count: home.toGrade }), href: "/teacher/assignments", icon: IconClipboardCheck, urgent: true });
  }
  if (home.lastClass && !home.lastClass.recap) {
    todo.push({ key: "recap", label: td("todo.recap", { topic: home.lastClass.topic }), href: `/classes/${home.lastClass.id}`, icon: IconNotebook });
  }
  for (const material of home.rejectedMaterials) {
    todo.push({ key: `material-${material.id}`, label: td("todo.rejected", { title: material.title }), href: `/teacher/materials/${material.id}`, icon: IconFileAlert });
  }
  if (!home.hasAvailability) {
    todo.push({ key: "availability", label: td("todo.availability"), href: "/teacher/availability", icon: IconCalendarTime, urgent: true });
  }
  if (quiet.length) {
    todo.push({ key: "quiet", label: td("todo.quiet", { count: quiet.length }), href: "/teacher/students", icon: IconUserExclamation });
  }
  if (profileReminder) {
    todo.push({
      key: "profile",
      label: td(profileReminder === "photo" ? "todo.photo" : "todo.twoFactor"),
      href: "/settings",
      icon: profileReminder === "photo" ? IconUserCircle : IconShieldLock,
    });
  }

  const stats = [
    { key: "today", value: `${todayCount}`, icon: IconCalendarEvent, color: "primary" },
    { key: "week", value: `${weekCount}`, icon: IconVideo, color: "success" },
    { key: "taught", value: `${extras.classesTaught}`, icon: IconSchool, color: "secondary" },
    {
      key: "rating",
      value: extras.ratingCount ? extras.ratingAverage.toFixed(1) : "—",
      icon: IconStar,
      color: "warning",
    },
  ] as const;

  const nextLevelDetails = extras.nextLevel
    ? [
        extras.nextLevel.classes ? td("moreClasses", { count: extras.nextLevel.classes }) : null,
        extras.nextLevel.ratings ? td("moreRatings", { count: extras.nextLevel.ratings }) : null,
        td("averageRating", { rating: extras.nextLevel.rating }),
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const lastText = home.lastClass?.recap ?? home.lastClass?.summary ?? null;

  return (
    <Box>
      <Breadcrumb title={td("greeting", { firstName })} subtitle={td("subtitle")} />

      <Grid container spacing={3}>
        {/* Next class + money, like the student's next class + credits. */}
        <Grid size={12}>
          <Card elevation={9} sx={{ background: "linear-gradient(120deg, #FFFFFF 0%, #FBF2EF 100%)" }}>
            <CardContent sx={{ p: { xs: "24px", md: "35px" } }}>
              <Grid container spacing={3} alignItems="center">
                <Grid size={{ xs: 12, md: 7 }}>
                  <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <Avatar sx={{ width: 52, height: 52, bgcolor: "primary.main", color: "#fff" }}>
                      <IconCalendarEvent size={26} />
                    </Avatar>
                    <Box>
                      <Chip
                        label={next?.live ? td("liveNow") : td("nextClassChip")}
                        color={next?.live ? "error" : "primary"}
                        size="small"
                        variant={next?.live ? "filled" : "outlined"}
                      />
                      <Typography variant="h5" mt={0.75}>
                        {next ? topic(next) : td("noNextClass")}
                      </Typography>
                    </Box>
                  </Stack>
                  {next ? (
                    <Stack spacing={1} mb={2.5}>
                      <Typography color="text.secondary">
                        {date(next.startsAt)} · {td("minutes", { count: next.duration })} · {typeLabel(next)}
                        {upcoming.length > 1 ? ` · ${td("moreUpcoming", { count: upcoming.length - 1 })}` : ""}
                      </Typography>
                      {students(next).length ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <AvatarGroup max={3} sx={{ "& .MuiAvatar-root": { width: 26, height: 26, fontSize: 13 } }}>
                            {students(next).map((name) => (
                              <Avatar key={name}>{name.charAt(0)}</Avatar>
                            ))}
                          </AvatarGroup>
                          <Typography variant="body2" color="text.secondary">
                            {td("with", { names: students(next).join(", ") })}
                          </Typography>
                        </Stack>
                      ) : null}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary" mb={2.5}>
                      {home.hasAvailability ? td("noNextClassHint") : td("noAvailabilityHint")}
                    </Typography>
                  )}
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    {next ? (
                      <LinkButton
                        href={next.canJoin ? `/classes/${next.id}/room` : `/classes/${next.id}`}
                        variant="contained"
                        startIcon={<IconVideo size={18} />}
                      >
                        {next.canJoin ? td("enterRoom") : td("prepareClass")}
                      </LinkButton>
                    ) : null}
                    <LinkButton
                      href="/teacher/availability"
                      variant={next ? "outlined" : "contained"}
                      startIcon={<IconCalendarTime size={18} />}
                    >
                      {td("availability")}
                    </LinkButton>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Box sx={{ p: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconCash size={18} />
                      <Typography variant="body2" color="text.secondary">
                        {td("earnedThisMonth")}
                      </Typography>
                    </Stack>
                    <Typography variant="h4" fontWeight={700} my={1}>
                      {money(extras.earnedThisMonthCents)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {extras.unpaidCents
                        ? td("notPaidYet", { amount: money(extras.unpaidCents) })
                        : extras.classesTaught
                          ? td("allPaid")
                          : td("noEarningsYet")}
                    </Typography>
                    <LinkButton href="/teacher/earnings" size="small" variant="outlined" endIcon={<IconArrowRight size={14} />}>
                      {td("seeEarnings")}
                    </LinkButton>
                  </Box>
                </Grid>
              </Grid>
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
                      <Typography variant="h4" fontWeight={700}>
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.key === "rating"
                          ? extras.ratingCount
                            ? td("stat.ratingCount", { count: extras.ratingCount })
                            : td("noRatingsYet")
                          : td(`stat.${stat.key}`)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title={td("todoTitle")} subtitle={td("todoSubtitle")}>
            {todo.length ? (
              <Stack spacing={1.5}>
                {todo.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Stack key={item.key} direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          bgcolor: item.urgent ? "primary.light" : "grey.100",
                          color: item.urgent ? "primary.main" : "text.primary",
                          width: 36,
                          height: 36,
                        }}
                      >
                        <Icon size={18} />
                      </Avatar>
                      <Typography variant="body2" flexGrow={1}>
                        {item.label}
                      </Typography>
                      <LinkButton href={item.href} size="small" variant="text" endIcon={<IconArrowRight size={14} />}>
                        {td("go")}
                      </LinkButton>
                    </Stack>
                  );
                })}
              </Stack>
            ) : (
              <Typography color="text.secondary">{td("allDone")}</Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard
            title={td("nextLiveClasses")}
            subtitle={td("timesIn", { zone: timeZone.replace(/_/g, " ") })}
            action={
              <LinkButton size="small" href="/classes" endIcon={<IconArrowRight size={14} />}>
                {td("allClasses")}
              </LinkButton>
            }
          >
            {upcoming.length ? (
              <Stack spacing={1.5} divider={<Divider flexItem />}>
                {upcoming.slice(0, 5).map((item) => (
                  <Stack key={item.id} direction="row" spacing={2} alignItems="center">
                    <Box sx={{ width: 84, flexShrink: 0, textAlign: "center" }}>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", textTransform: "capitalize" }}>
                        {shortDate(item.startsAt)}
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {time(item.startsAt)}
                      </Typography>
                    </Box>
                    <Box flexGrow={1} minWidth={0}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                          {topic(item)}
                        </Typography>
                        {item.live ? <Chip label={td("liveNow")} color="error" size="small" /> : null}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {(students(item).join(", ") || td("noStudentYet"))} · {td("minutes", { count: item.duration })}
                      </Typography>
                    </Box>
                    <LinkButton
                      href={item.canJoin ? `/classes/${item.id}/room` : `/classes/${item.id}`}
                      size="small"
                      variant={item.canJoin ? "contained" : "outlined"}
                    >
                      {item.canJoin ? td("enter") : td("open")}
                    </LinkButton>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Stack spacing={2} alignItems="flex-start">
                <Typography variant="body2" color="text.secondary">
                  {td("noClassesScheduled")}
                </Typography>
                <LinkButton href="/teacher/availability" size="small" variant="outlined" startIcon={<IconCalendarTime size={16} />}>
                  {td("availability")}
                </LinkButton>
              </Stack>
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <SectionCard title={td("lastClassTitle")}>
            {home.lastClass ? (
              <Stack spacing={1.5}>
                <Typography variant="h6">{home.lastClass.topic}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconClock size={16} />
                  <Typography variant="body2" color="text.secondary">
                    {date(home.lastClass.startsAt)}
                    {home.lastClass.students.length ? ` · ${td("with", { names: home.lastClass.students.join(", ") })}` : ""}
                  </Typography>
                </Stack>
                {!home.lastClass.recap && home.lastClass.summary ? (
                  <Chip icon={<IconSparkles size={14} />} label={td("aiSummary")} size="small" color="secondary" variant="outlined" sx={{ alignSelf: "flex-start" }} />
                ) : null}
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {lastText ? (lastText.length > 240 ? `${lastText.slice(0, 240)}…` : lastText) : td("noRecapYet")}
                </Typography>
                <LinkButton
                  href={`/classes/${home.lastClass.id}`}
                  size="small"
                  variant={home.lastClass.recap ? "outlined" : "contained"}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {home.lastClass.recap ? td("openClass") : td("writeRecap")}
                </LinkButton>
              </Stack>
            ) : (
              <Typography color="text.secondary">{td("noPastClasses")}</Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <SectionCard
            title={td("activityTitle")}
            subtitle={td("activitySubtitle")}
            action={
              <LinkButton size="small" href="/teacher/students" endIcon={<IconArrowRight size={14} />}>
                {td("allStudents")}
              </LinkButton>
            }
          >
            <Stack spacing={1.5}>
              {home.practice.map((item) => (
                <Stack key={item.id} direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ width: 34, height: 34, fontSize: 15 }}>{item.studentName.charAt(0)}</Avatar>
                  <Box flexGrow={1} minWidth={0}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {item.studentName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="p">
                      {td("practiced", { title: item.materialTitle })} · {format.relativeTime(new Date(item.createdAt), nowMs)}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    icon={<IconFlame size={14} />}
                    label={`${item.percent}% · ${item.xp} XP`}
                    color={item.percent >= 80 ? "success" : item.percent >= 50 ? "warning" : "error"}
                    variant="outlined"
                  />
                </Stack>
              ))}
              {quiet.slice(0, 3).map((student) => (
                <Stack key={student.id} direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ width: 34, height: 34, bgcolor: "warning.light", color: "warning.main" }}>
                    <IconAlertTriangle size={16} />
                  </Avatar>
                  <Box flexGrow={1} minWidth={0}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {student.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="p">
                      {td("quietSince", { date: shortDate(new Date(student.last).toISOString()) })}
                    </Typography>
                  </Box>
                </Stack>
              ))}
              {!home.practice.length && !quiet.length ? (
                <Typography variant="body2" color="text.secondary">
                  {td("activityEmpty")}
                </Typography>
              ) : null}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard
            title={extras.levelName}
            subtitle={td("teacherShare", { percent: extras.levelPercent, count: extras.classesTaught })}
            action={
              <Avatar sx={{ width: 38, height: 38, bgcolor: "warning.light", color: "warning.main" }}>
                <IconChecklist size={20} />
              </Avatar>
            }
          >
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary" data-testid="next-level">
                {extras.nextLevel
                  ? td("nextLevel", { name: extras.nextLevel.name, details: nextLevelDetails })
                  : td("topLevel")}
              </Typography>
              {extras.badges.length ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {extras.badges.map((badge) => (
                    <Chip key={badge.id} label={badge.label} title={badge.description} color="success" size="small" />
                  ))}
                </Stack>
              ) : null}
              <Divider />
              <Typography variant="subtitle2">{td("latestRatings")}</Typography>
              {extras.recentRatings.length ? (
                extras.recentRatings.slice(0, 2).map((rating, index) => (
                  <Box key={`${rating.createdAt}-${index}`}>
                    <Typography variant="body2" fontWeight={600}>
                      <Box component="span" sx={{ color: "warning.main" }}>
                        {"★".repeat(rating.stars)}
                        {"☆".repeat(5 - rating.stars)}
                      </Box>{" "}
                      · {rating.studentName}
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
                  {td("noRatingsYet")}
                </Typography>
              )}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
