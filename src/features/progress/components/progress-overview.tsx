"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { IconClock, IconFlame, IconLanguage, IconSchool, IconTargetArrow, IconTrophy } from "@tabler/icons-react";
import { WeeklyActivityChart } from "@/components/charts/weekly-activity-chart";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { SummaryBanner } from "@/components/ui/summary-banner";
import type { StudentInsights } from "@/lib/learning-types";

type ProgressOverviewProps = {
  insights: StudentInsights;
  timeZone: string;
};

type ChartView = "week" | "weeks";

function hoursLabel(minutes: number) {
  const hours = minutes / 60;
  return hours >= 10 ? String(Math.round(hours)) : hours.toFixed(1).replace(/\.0$/, "");
}

/** Progress from real activity, with the My classes layout: summary, chart + milestones, side panels. */
export function ProgressOverview({ insights, timeZone }: ProgressOverviewProps) {
  const t = useTranslations("student.learn.progress");
  const tAch = useTranslations("student.learn.achievements");
  const format = useFormatter();
  const [view, setView] = useState<ChartView>("week");

  const dayLabels = insights.weeklyMinutes.map((day) =>
    format.dateTime(new Date(`${day.date}T12:00:00Z`), { weekday: "short", timeZone: "UTC" }),
  );
  const weekLabels = insights.weeklyClasses.map((week) =>
    format.dateTime(new Date(`${week.weekStart}T12:00:00Z`), { month: "short", day: "numeric", timeZone: "UTC" }),
  );
  const recent = insights.achievements
    .filter((item) => item.unlocked)
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))
    .slice(0, 3);
  const next =
    insights.achievements.filter((item) => !item.unlocked).sort((a, b) => b.progress - a.progress)[0] ?? null;
  const weekMinutes = insights.weeklyMinutes.reduce((sum, day) => sum + day.minutes, 0);
  const weeksClasses = insights.weeklyClasses.reduce((sum, week) => sum + week.classes, 0);

  return (
    <Box>
      <Breadcrumb title={t("title")} subtitle={t("subtitle")} />

      <SummaryBanner
        items={[
          { key: "classes", icon: IconSchool, color: "primary", value: insights.classesCompleted, label: t("stat.classes") },
          { key: "hours", icon: IconClock, color: "secondary", value: hoursLabel(insights.minutesInClass), label: t("stat.hours") },
          { key: "streak", icon: IconFlame, color: "warning", value: insights.weekStreak, label: t("stat.streak") },
          { key: "words", icon: IconLanguage, color: "success", value: insights.wordsLearned, label: t("stat.words") },
        ]}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Card elevation={9}>
              <Box sx={{ px: 2 }}>
                <Tabs value={view} onChange={(_, value: ChartView) => setView(value)} variant="scrollable" allowScrollButtonsMobile>
                  <Tab value="week" label={t("weekTitle")} />
                  <Tab value="weeks" label={t("weeksTitle")} />
                </Tabs>
              </Box>
            </Card>

            <SectionCard
              padding="15px"
              title={view === "week" ? t("weekSubtitle") : t("weeksSubtitle")}
              subtitle={
                view === "week"
                  ? t("chart.weekTotal", { minutes: weekMinutes })
                  : t("chart.weeksTotal", { classes: weeksClasses })
              }
            >
              {view === "week" ? (
                <WeeklyActivityChart
                  key="week"
                  categories={dayLabels}
                  data={insights.weeklyMinutes.map((day) => day.minutes)}
                  height={280}
                  label={t("minutesLabel")}
                />
              ) : (
                <WeeklyActivityChart
                  key="weeks"
                  categories={weekLabels}
                  data={insights.weeklyClasses.map((week) => week.classes)}
                  height={280}
                  label={t("classesLabel")}
                  unitSuffix=""
                />
              )}
            </SectionCard>

            <SectionCard
              padding="15px"
              title={t("milestones")}
              subtitle={t("milestonesSubtitle")}
              action={
                <LinkButton href="/progress?tab=achievements" size="small" variant="outlined">
                  {t("seeAll")}
                </LinkButton>
              }
            >
              {recent.length ? (
                <Stack spacing={2}>
                  {recent.map((item) => (
                    <Stack key={item.id} direction="row" spacing={2} alignItems="flex-start">
                      <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
                        <IconTrophy size={22} />
                      </Avatar>
                      <Box flexGrow={1}>
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={0.5}>
                          <Typography variant="h6">{tAch(`${item.id}.title`)}</Typography>
                          {item.unlockedAt ? (
                            <Typography variant="body2" color="text.secondary">
                              {format.dateTime(new Date(item.unlockedAt), { dateStyle: "medium", timeZone })}
                            </Typography>
                          ) : null}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {tAch(`${item.id}.description`)}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">{t("noMilestones")}</Typography>
              )}
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <SectionCard padding="15px" title={t("wordsTitle")} subtitle={t("wordsSubtitle")}>
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2">{t("learned")}</Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      {insights.wordsLearned}/{insights.wordsTotal}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={insights.wordsTotal ? (insights.wordsLearned / insights.wordsTotal) * 100 : 0}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {t("due", { count: insights.wordsDue })}
                </Typography>
                <LinkButton href="/study?tab=vocabulary" size="small" variant="outlined" sx={{ alignSelf: "flex-start" }}>
                  {t("goVocabulary")}
                </LinkButton>
              </Stack>
            </SectionCard>

            <SectionCard padding="15px" title={t("practiceTitle")} subtitle={t("practiceSubtitle")}>
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2">{t("average")}</Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      {insights.averageScore === null ? "—" : `${insights.averageScore}%`}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    color="success"
                    value={insights.averageScore ?? 0}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {t("practiceCounts", { submitted: insights.assignmentsSubmitted, pending: insights.assignmentsPending })}
                </Typography>
                <LinkButton href="/study?tab=practice" size="small" variant="outlined" sx={{ alignSelf: "flex-start" }}>
                  {t("goPractice")}
                </LinkButton>
              </Stack>
            </SectionCard>

            {next ? (
              <SectionCard padding="15px" title={t("next.title")} subtitle={t("next.subtitle")}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                  <Avatar sx={{ bgcolor: "warning.light", color: "warning.main" }}>
                    <IconTargetArrow size={20} />
                  </Avatar>
                  <Box minWidth={0}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {tAch(`${next.id}.title`)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tAch(`${next.id}.description`)}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    {t("next.progress")}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {next.current}/{next.goal}
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" color="warning" value={next.progress} sx={{ height: 8, borderRadius: 4 }} />
              </SectionCard>
            ) : null}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
