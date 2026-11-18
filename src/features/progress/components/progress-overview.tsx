"use client";

import { useFormatter, useTranslations } from "next-intl";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconTrophy } from "@tabler/icons-react";
import { WeeklyActivityChart } from "@/components/charts/weekly-activity-chart";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import type { StudentInsights } from "@/lib/learning-types";

type ProgressOverviewProps = {
  insights: StudentInsights;
  timeZone: string;
};

function hoursLabel(minutes: number) {
  const hours = minutes / 60;
  return hours >= 10 ? String(Math.round(hours)) : hours.toFixed(1).replace(/\.0$/, "");
}

/** Progress from real activity: classes, time in class, words and practice. */
export function ProgressOverview({ insights, timeZone }: ProgressOverviewProps) {
  const t = useTranslations("student.learn.progress");
  const tAch = useTranslations("student.learn.achievements");
  const format = useFormatter();

  const stats = [
    { key: "classes", value: String(insights.classesCompleted), color: "primary" },
    { key: "hours", value: hoursLabel(insights.minutesInClass), color: "secondary" },
    { key: "streak", value: String(insights.weekStreak), color: "warning" },
    { key: "words", value: String(insights.wordsLearned), color: "success" },
  ] as const;

  const dayLabels = insights.weeklyMinutes.map((day) =>
    format.dateTime(new Date(`${day.date}T12:00:00Z`), { weekday: "short", timeZone: "UTC" }),
  );
  const weekLabels = insights.weeklyClasses.map((week) =>
    format.dateTime(new Date(`${week.weekStart}T12:00:00Z`), {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  );
  const recent = insights.achievements
    .filter((item) => item.unlocked)
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))
    .slice(0, 3);

  return (
    <Box mt={3}>
      <Breadcrumb title={t("title")} subtitle={t("subtitle")} />

      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid key={stat.key} size={{ xs: 12, sm: 6, lg: 3 }}>
            <SectionCard>
              <Typography variant="subtitle1" color="text.secondary">
                {t(`stat.${stat.key}`)}
              </Typography>
              <Typography variant="h3" fontWeight={700} color={`${stat.color}.main`} mt={1}>
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(`helper.${stat.key}`)}
              </Typography>
            </SectionCard>
          </Grid>
        ))}

        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title={t("weekTitle")} subtitle={t("weekSubtitle")}>
            <WeeklyActivityChart
              categories={dayLabels}
              data={insights.weeklyMinutes.map((day) => day.minutes)}
              height={280}
              label={t("minutesLabel")}
            />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title={t("weeksTitle")} subtitle={t("weeksSubtitle")}>
            <WeeklyActivityChart
              categories={weekLabels}
              data={insights.weeklyClasses.map((week) => week.classes)}
              height={280}
              label={t("classesLabel")}
              unitSuffix=""
            />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title={t("wordsTitle")} subtitle={t("wordsSubtitle")}>
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
              <LinkButton href="/vocabulary" size="small" variant="outlined" sx={{ alignSelf: "flex-start" }}>
                {t("goVocabulary")}
              </LinkButton>
            </Stack>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title={t("practiceTitle")} subtitle={t("practiceSubtitle")}>
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
                {t("practiceCounts", {
                  submitted: insights.assignmentsSubmitted,
                  pending: insights.assignmentsPending,
                })}
              </Typography>
              <LinkButton href="/practice" size="small" variant="outlined" sx={{ alignSelf: "flex-start" }}>
                {t("goPractice")}
              </LinkButton>
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={12}>
          <SectionCard title={t("milestones")} subtitle={t("milestonesSubtitle")}>
            {recent.length ? (
              <Stack spacing={3}>
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
        </Grid>
      </Grid>
    </Box>
  );
}
