import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconTrophy } from "@tabler/icons-react";
import { WeeklyActivityChart } from "@/components/charts/weekly-activity-chart";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import {
  milestones,
  progressStats,
  skills,
  weeklyActivity,
} from "@/features/progress/data";

export function ProgressOverview() {
  return (
    <Box mt={3}>
      <Breadcrumb title="Progress" subtitle="Track your learning journey" />

      <Grid container spacing={3}>
        {progressStats.map((stat) => (
          <Grid key={stat.title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <SectionCard>
              <Typography variant="subtitle1" color="text.secondary">
                {stat.title}
              </Typography>
              <Typography
                variant="h3"
                fontWeight={700}
                color={`${stat.color}.main`}
                mt={1}
              >
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.helper}
              </Typography>
            </SectionCard>
          </Grid>
        ))}

        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard
            title="Weekly activity"
            subtitle="Minutes studied per day"
          >
            <WeeklyActivityChart
              categories={weeklyActivity.categories}
              data={weeklyActivity.minutes}
              height={300}
            />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title="Skill breakdown" subtitle="Self-assessed level">
            <Stack spacing={3}>
              {skills.map((skill) => (
                <Box key={skill.name}>
                  <Stack direction="row" justifyContent="space-between" mb={1}>
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

        <Grid size={12}>
          <SectionCard title="Recent milestones" subtitle="Small wins add up">
            <Stack spacing={3}>
              {milestones.map((milestone) => (
                <Stack
                  key={milestone.id}
                  direction="row"
                  spacing={2}
                  alignItems="flex-start"
                >
                  <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
                    <IconTrophy size={22} />
                  </Avatar>
                  <Box flexGrow={1}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      spacing={0.5}
                    >
                      <Typography variant="h6">{milestone.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {milestone.date}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {milestone.description}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
