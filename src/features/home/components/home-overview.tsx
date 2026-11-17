"use client";

import type { ComponentType } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconBook,
  IconCalendarEvent,
  IconCards,
  IconCheck,
  IconFlame,
  IconHeadphones,
  IconPlayerPlay,
  IconTargetArrow,
  IconTrophy,
  IconVideo,
} from "@tabler/icons-react";
import { WeeklyActivityChart } from "@/components/charts/weekly-activity-chart";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { formatClassType } from "@/features/classes/format";
import {
  dailyGoal,
  featuredLesson,
  homeStats,
  latestAchievement,
  liveClass,
  livePackage,
  nextAchievement,
  reviewWords,
  todayPlan,
  wordsToReview,
} from "@/features/home/data";
import type { HomeStatIcon, PlanTaskIcon } from "@/features/home/data";
import { skills, weeklyActivity } from "@/features/progress";

const statIcons: Record<HomeStatIcon, ComponentType<{ size?: number }>> = {
  flame: IconFlame,
  target: IconTargetArrow,
  cards: IconCards,
  book: IconBook,
};

const planIcons: Record<PlanTaskIcon, ComponentType<{ size?: number }>> = {
  cards: IconCards,
  book: IconBook,
  headphones: IconHeadphones,
};

type HomeOverviewProps = {
  firstName: string;
};

export function HomeOverview({ firstName }: HomeOverviewProps) {
  const completedTasks = todayPlan.filter((task) => task.done).length;

  return (
    <Box mt={3}>
      <Breadcrumb
        title={`Learning overview, ${firstName}`}
        subtitle="Your plan for today while the Student dashboard is active. Switch roles from the top bar to open Teacher, Manager, or Admin."
      />

      <Grid container spacing={3}>
        <Grid size={12}>
          <Card
            elevation={9}
            sx={{
              background: "linear-gradient(120deg, #FFFFFF 0%, #FBF2EF 100%)",
            }}
          >
            <CardContent sx={{ p: { xs: "30px", md: "35px" } }}>
              <Grid container spacing={3} alignItems="center">
                <Grid size={{ xs: 12, md: 7 }}>
                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    mb={2}
                  >
                    <Avatar
                      sx={{
                        width: 52,
                        height: 52,
                        bgcolor: "primary.main",
                        color: "#fff",
                      }}
                    >
                      <IconCalendarEvent size={26} />
                    </Avatar>
                    <Box>
                      <Chip
                        label="Live classes"
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                      <Typography variant="h5" mt={0.75}>
                        Next class with {liveClass.teacherName}
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography color="text.secondary" mb={2.5}>
                    {liveClass.shortDate} at {liveClass.time} ·{" "}
                    {liveClass.duration} min ·{" "}
                    {formatClassType(liveClass.type)} ·{" "}
                    {liveClass.topic}
                  </Typography>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                  >
                    <LinkButton
                      href="/classes"
                      variant="contained"
                      startIcon={<IconVideo size={18} />}
                    >
                      My classes
                    </LinkButton>
                    <LinkButton
                      href="/schedule"
                      variant="outlined"
                      startIcon={<IconCalendarEvent size={18} />}
                    >
                      Book a class
                    </LinkButton>
                    <LinkButton href="/pricing" variant="outlined">
                      View plans
                    </LinkButton>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 5 }}>
                  <Box
                    sx={{
                      p: 3,
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={2}
                    >
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Active package
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {livePackage.classesRemaining} classes left
                        </Typography>
                      </Box>
                      <Avatar
                        src={liveClass.teacherAvatar}
                        alt={liveClass.teacherName}
                        sx={{ width: 40, height: 40 }}
                      />
                    </Stack>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      mb={2}
                    >
                      {livePackage.plan.classes}-class package ·{" "}
                      {livePackage.plan.duration} min ·{" "}
                      {formatClassType(livePackage.plan.type)}
                    </Typography>

                    <LinearProgress
                      variant="determinate"
                      value={
                        (livePackage.classesRemaining /
                          livePackage.plan.classes) *
                        100
                      }
                      sx={{ height: 8, borderRadius: 4 }}
                    />

                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Renews {livePackage.renewalDate}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card
            elevation={9}
            sx={{
              background: "linear-gradient(135deg, #FBF2EF 0%, #FFFFFF 62%)",
              overflow: "hidden",
            }}
          >
            <CardContent sx={{ p: { xs: "30px", md: "40px" } }}>
              <Grid container spacing={3} alignItems="center">
                <Grid size={{ xs: 12, md: 8 }}>
                  <Chip label="Continue learning" color="primary" size="small" />
                  <Typography variant="h3" fontWeight={700} mt={2}>
                    {featuredLesson.title}
                  </Typography>
                  <Typography color="text.secondary" mt={1}>
                    {featuredLesson.level} · {featuredLesson.duration} · Lesson{" "}
                    {featuredLesson.id}
                  </Typography>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    mt={3}
                  >
                    <LinkButton
                      href="/lessons"
                      variant="contained"
                      color="primary"
                      startIcon={<IconPlayerPlay size={18} />}
                    >
                      Resume lesson
                    </LinkButton>
                    <LinkButton
                      href="/practice"
                      variant="outlined"
                      color="primary"
                    >
                      Practice 5 min
                    </LinkButton>
                  </Stack>

                  <Box mt={3} maxWidth={460}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      mb={0.75}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Lesson progress
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {featuredLesson.progress}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={featuredLesson.progress}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Grid>

                <Grid
                  size={{ xs: 12, md: 4 }}
                  sx={{
                    display: { xs: "none", md: "flex" },
                    justifyContent: "center",
                  }}
                >
                  <Avatar
                    sx={{
                      width: 160,
                      height: 160,
                      bgcolor: "primary.main",
                      color: "#fff",
                      boxShadow: "0 12px 24px -4px rgba(250,137,107,0.35)",
                    }}
                  >
                    <IconBook size={72} />
                  </Avatar>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {homeStats.map((stat) => {
          const Icon = statIcons[stat.icon];

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
                        {stat.title}
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

        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard
            title="Today's plan"
            subtitle="Three small wins"
            action={
              <Chip
                label={`${completedTasks}/${todayPlan.length} done`}
                color="primary"
                size="small"
                variant="outlined"
              />
            }
          >
            <Stack spacing={2}>
              {todayPlan.map((task) => {
                const Icon = planIcons[task.icon];

                return (
                  <Stack
                    key={task.id}
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{
                      p: 1.5,
                      bgcolor: task.done ? "success.light" : "grey.100",
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: task.done ? "success.main" : "background.paper",
                        color: task.done ? "#fff" : "primary.main",
                      }}
                    >
                      {task.done ? <IconCheck size={20} /> : <Icon size={20} />}
                    </Avatar>

                    <Box flexGrow={1} minWidth={0}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {task.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {task.description}
                      </Typography>
                    </Box>

                    <Stack alignItems="flex-end" spacing={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        {task.minutes} min
                      </Typography>
                      {task.done ? (
                        <Typography
                          variant="body2"
                          color="success.main"
                          fontWeight={600}
                        >
                          Done
                        </Typography>
                      ) : (
                        <LinkButton
                          size="small"
                          href={task.href}
                          endIcon={<IconArrowRight size={14} />}
                        >
                          Start
                        </LinkButton>
                      )}
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard
            title="Weekly activity"
            subtitle="Minutes studied per day"
            action={
              <Chip
                label={`${dailyGoal.completed}/${dailyGoal.target} min today`}
                color="secondary"
                size="small"
                variant="outlined"
              />
            }
          >
            <WeeklyActivityChart
              categories={weeklyActivity.categories}
              data={weeklyActivity.minutes}
              height={300}
            />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard
            title="Vocabulary review"
            subtitle={`${wordsToReview} words due today`}
            action={
              <LinkButton
                size="small"
                href="/vocabulary"
                endIcon={<IconArrowRight size={14} />}
              >
                Review all
              </LinkButton>
            }
          >
            <Stack spacing={2}>
              {reviewWords.map((word) => (
                <Box key={word.id} sx={{ p: 1.5, bgcolor: "grey.100" }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                  >
                    <Box minWidth={0}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {word.term}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {word.translation}
                      </Typography>
                    </Box>
                    <Chip
                      label={word.category}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard
            title="Achievements"
            subtitle="Keep the momentum"
            action={
              <LinkButton
                size="small"
                href="/achievements"
                endIcon={<IconArrowRight size={14} />}
              >
                View all
              </LinkButton>
            }
          >
            <Stack spacing={3}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    width: 52,
                    height: 52,
                    bgcolor: "primary.light",
                    color: "primary.main",
                  }}
                >
                  <IconTrophy size={26} />
                </Avatar>
                <Box minWidth={0}>
                  <Typography variant="body2" color="text.secondary">
                    Latest badge
                  </Typography>
                  <Typography variant="h6">
                    {latestAchievement.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {latestAchievement.description}
                  </Typography>
                </Box>
              </Stack>

              <Divider />

              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb={1}
                >
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Next badge
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {nextAchievement.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    {nextAchievement.progress}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={nextAchievement.progress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard
            title="Skill snapshot"
            subtitle="Where to focus next"
            action={
              <LinkButton
                size="small"
                href="/progress"
                endIcon={<IconArrowRight size={14} />}
              >
                Progress
              </LinkButton>
            }
          >
            <Stack spacing={2.5}>
              {skills.map((skill) => (
                <Box key={skill.name}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    mb={0.75}
                  >
                    <Typography variant="subtitle2">{skill.name}</Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      {skill.value}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={skill.value}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              ))}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
