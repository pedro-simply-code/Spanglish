"use client";

import type { ComponentType } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconBolt,
  IconCalendarEvent,
  IconCards,
  IconChecklist,
  IconClock,
  IconFlame,
  IconMedal,
  IconNotebook,
  IconSchool,
  IconStar,
  IconTargetArrow,
  IconTrophy,
  IconVideo,
} from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { WeeklyActivityChart } from "@/components/charts/weekly-activity-chart";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { formatClassType } from "@/features/classes/format";
import type { ClassType } from "@/features/academy/data";
import type {
  AssignmentSummary,
  LessonEntry,
  StudentAchievement,
  StudentInsights,
} from "@/lib/learning-types";

const achievementIcons: Record<StudentAchievement["icon"], ComponentType<{ size?: number }>> = {
  trophy: IconTrophy,
  flame: IconFlame,
  star: IconStar,
  bolt: IconBolt,
  target: IconTargetArrow,
  medal: IconMedal,
};

export type HomeNextClass = {
  id: string;
  topic: string;
  teacherName: string;
  teacherAvatar: string;
  startsAt: string;
  durationMinutes: number;
  type: ClassType;
  /** The classroom is open now. */
  canJoin: boolean;
};

export type HomeBalance = {
  classType: ClassType;
  durationMinutes: number;
  balance: number;
  shared: boolean;
};

type HomeOverviewProps = {
  firstName: string;
  timeZone: string;
  nextClass: HomeNextClass | null;
  upcomingCount: number;
  balances: HomeBalance[];
  insights: StudentInsights;
  pendingAssignments: AssignmentSummary[];
  lastLesson: LessonEntry | null;
};

/** The student's home: next class, credits, what to do now, and real progress. */
export function HomeOverview({
  firstName,
  timeZone,
  nextClass,
  upcomingCount,
  balances,
  insights,
  pendingAssignments,
  lastLesson,
}: HomeOverviewProps) {
  const t = useTranslations("student.learn.home");
  const tStudent = useTranslations("student");
  const tAch = useTranslations("student.learn.achievements");
  const format = useFormatter();
  const date = (iso: string) =>
    format.dateTime(new Date(iso), { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone });
  const credits = balances.reduce((sum, item) => sum + item.balance, 0);
  const nextAchievement = insights.achievements.find((item) => !item.unlocked) ?? null;

  const stats = [
    { key: "classes", value: insights.classesCompleted, icon: IconSchool, color: "primary" },
    { key: "streak", value: insights.weekStreak, icon: IconFlame, color: "warning" },
    { key: "words", value: insights.wordsDue, icon: IconCards, color: "secondary" },
    { key: "practice", value: insights.assignmentsPending, icon: IconChecklist, color: "success" },
  ] as const;

  const todo: { key: string; label: string; href: string; icon: ComponentType<{ size?: number }> }[] = [];
  if (nextClass?.canJoin) {
    todo.push({ key: "join", label: t("todo.join", { topic: nextClass.topic }), href: `/classes/${nextClass.id}/room`, icon: IconVideo });
  }
  for (const assignment of pendingAssignments) {
    todo.push({
      key: assignment.id,
      label: assignment.dueAt
        ? t("todo.practiceDue", { title: assignment.title, date: date(assignment.dueAt) })
        : t("todo.practice", { title: assignment.title }),
      href: `/practice/${assignment.id}`,
      icon: IconChecklist,
    });
  }
  if (insights.wordsDue) {
    todo.push({ key: "words", label: t("todo.words", { count: insights.wordsDue }), href: "/vocabulary", icon: IconCards });
  }
  if (lastLesson?.homework) {
    todo.push({ key: "homework", label: t("todo.homework", { topic: lastLesson.topic }), href: `/classes/${lastLesson.id}`, icon: IconNotebook });
  }
  if (!nextClass) {
    todo.push({ key: "book", label: t("todo.book"), href: "/schedule", icon: IconCalendarEvent });
  }

  return (
    <Box mt={3}>
      <Breadcrumb title={tStudent("home.breadcrumbTitle", { firstName })} subtitle={t("subtitle")} />

      <Grid container spacing={3}>
        <Grid size={12}>
          <Card elevation={9} sx={{ background: "linear-gradient(120deg, #FFFFFF 0%, #FBF2EF 100%)" }}>
            <CardContent sx={{ p: { xs: "30px", md: "35px" } }}>
              <Grid container spacing={3} alignItems="center">
                <Grid size={{ xs: 12, md: 7 }}>
                  <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <Avatar
                      src={nextClass?.teacherAvatar}
                      sx={{ width: 52, height: 52, bgcolor: "primary.main", color: "#fff" }}
                    >
                      <IconCalendarEvent size={26} />
                    </Avatar>
                    <Box>
                      <Chip
                        label={nextClass?.canJoin ? t("liveNow") : t("nextClassChip")}
                        color={nextClass?.canJoin ? "error" : "primary"}
                        size="small"
                        variant={nextClass?.canJoin ? "filled" : "outlined"}
                      />
                      <Typography variant="h5" mt={0.75}>
                        {nextClass ? nextClass.topic : t("noNextClass")}
                      </Typography>
                    </Box>
                  </Stack>
                  {nextClass ? (
                    <Typography color="text.secondary" mb={2.5}>
                      {date(nextClass.startsAt)} · {t("with", { name: nextClass.teacherName })} ·{" "}
                      {tStudent("common.minutes", { count: nextClass.durationMinutes })} ·{" "}
                      {formatClassType(nextClass.type, tStudent)}
                      {upcomingCount > 1 ? ` · ${t("moreUpcoming", { count: upcomingCount - 1 })}` : ""}
                    </Typography>
                  ) : (
                    <Typography color="text.secondary" mb={2.5}>
                      {t("noNextClassHint")}
                    </Typography>
                  )}
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    {nextClass ? (
                      <LinkButton
                        href={nextClass.canJoin ? `/classes/${nextClass.id}/room` : `/classes/${nextClass.id}`}
                        variant="contained"
                        startIcon={<IconVideo size={18} />}
                      >
                        {nextClass.canJoin ? t("join") : t("viewClass")}
                      </LinkButton>
                    ) : null}
                    <LinkButton href="/schedule" variant="outlined" startIcon={<IconCalendarEvent size={18} />}>
                      {tStudent("actions.bookClass")}
                    </LinkButton>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Box sx={{ p: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="body2" color="text.secondary">
                      {t("credits")}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} mb={1}>
                      {t("classesLeft", { count: credits })}
                    </Typography>
                    <Stack spacing={0.5} mb={2}>
                      {balances.map((item) => (
                        <Typography key={`${item.classType}-${item.durationMinutes}-${item.shared}`} variant="body2" color="text.secondary">
                          {t("balanceLine", {
                            count: item.balance,
                            minutes: item.durationMinutes,
                            type: formatClassType(item.classType, tStudent),
                          })}
                          {item.shared ? ` · ${t("shared")}` : ""}
                        </Typography>
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <LinkButton href="/pricing" size="small" variant={credits ? "outlined" : "contained"}>
                        {t("buy")}
                      </LinkButton>
                      <LinkButton href="/credits" size="small" variant="text">
                        {t("history")}
                      </LinkButton>
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Grid key={stat.key} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card elevation={9}>
                <CardContent sx={{ p: "24px" }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: `${stat.color}.light`, color: `${stat.color}.main`, width: 48, height: 48 }}>
                      <Icon size={24} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t(`stat.${stat.key}`)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard title={t("todoTitle")} subtitle={t("todoSubtitle")}>
            {todo.length ? (
              <Stack spacing={1.5}>
                {todo.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Stack key={item.key} direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: "grey.100", color: "text.primary", width: 36, height: 36 }}>
                        <Icon size={18} />
                      </Avatar>
                      <Typography variant="body2" flexGrow={1}>
                        {item.label}
                      </Typography>
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

        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard title={t("weekTitle")} subtitle={t("weekSubtitle", { minutes: insights.weeklyMinutes.reduce((sum, day) => sum + day.minutes, 0) })}>
            <WeeklyActivityChart
              categories={insights.weeklyMinutes.map((day) =>
                format.dateTime(new Date(`${day.date}T12:00:00Z`), { weekday: "short", timeZone: "UTC" }),
              )}
              data={insights.weeklyMinutes.map((day) => day.minutes)}
              height={240}
              label={t("minutesLabel")}
            />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title={t("lastLessonTitle")}>
            {lastLesson ? (
              <Stack spacing={1.5}>
                <Typography variant="h6">{lastLesson.topic}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconClock size={16} />
                  <Typography variant="body2" color="text.secondary">
                    {date(lastLesson.startsAt)} · {t("with", { name: lastLesson.teacherName })}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {lastLesson.recap
                    ? lastLesson.recap.length > 240
                      ? `${lastLesson.recap.slice(0, 240)}…`
                      : lastLesson.recap
                    : t("noRecap")}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <LinkButton href={`/classes/${lastLesson.id}`} size="small" variant="outlined">
                    {t("openLesson")}
                  </LinkButton>
                  <LinkButton href="/lessons" size="small" variant="text">
                    {t("allLessons")}
                  </LinkButton>
                </Stack>
              </Stack>
            ) : (
              <Typography color="text.secondary">{t("noLessons")}</Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title={t("nextAchievementTitle")}>
            {nextAchievement ? (
              (() => {
                const Icon = achievementIcons[nextAchievement.icon];
                return (
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", width: 48, height: 48 }}>
                        <Icon size={24} />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{tAch(`${nextAchievement.id}.title`)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {tAch(`${nextAchievement.id}.description`)}
                        </Typography>
                      </Box>
                    </Stack>
                    <Box>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          {tStudent("common.progress")}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {nextAchievement.current}/{nextAchievement.goal}
                        </Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={nextAchievement.progress} sx={{ height: 8, borderRadius: 4 }} />
                    </Box>
                    <LinkButton href="/achievements" size="small" variant="text" sx={{ alignSelf: "flex-start" }}>
                      {t("allAchievements")}
                    </LinkButton>
                  </Stack>
                );
              })()
            ) : (
              <Typography color="text.secondary">{t("allAchievementsDone")}</Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
