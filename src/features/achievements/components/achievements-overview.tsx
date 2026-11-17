"use client";

import type { ComponentType } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconBolt,
  IconFlame,
  IconLock,
  IconMedal,
  IconStar,
  IconTargetArrow,
  IconTrophy,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { achievements } from "@/features/achievements/data";
import type { AchievementIcon } from "@/features/achievements/data";

const icons: Record<AchievementIcon, ComponentType<{ size?: number }>> = {
  trophy: IconTrophy,
  flame: IconFlame,
  star: IconStar,
  bolt: IconBolt,
  target: IconTargetArrow,
  medal: IconMedal,
};

export function AchievementsOverview() {
  const unlocked = achievements.filter((item) => item.unlocked).length;

  return (
    <Box mt={3}>
      <Breadcrumb title="Achievements" subtitle="Celebrate your milestones" />

      <Card elevation={9} sx={{ mb: 3 }}>
        <CardContent sx={{ p: "30px" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={3}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h5">Your trophy case</Typography>
              <Typography variant="subtitle2" color="text.secondary">
                {unlocked} of {achievements.length} achievements unlocked
              </Typography>
            </Box>
            <Box flexGrow={1} maxWidth={{ sm: 360 }} width="100%">
              <LinearProgress
                variant="determinate"
                value={(unlocked / achievements.length) * 100}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {achievements.map((achievement) => {
          const Icon = icons[achievement.icon];

          return (
            <Grid key={achievement.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card elevation={9} sx={{ height: "100%" }}>
                <CardContent sx={{ p: "30px" }}>
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Avatar
                        sx={{
                          bgcolor: achievement.unlocked
                            ? "primary.light"
                            : "grey.100",
                          color: achievement.unlocked
                            ? "primary.main"
                            : "text.disabled",
                          width: 52,
                          height: 52,
                        }}
                      >
                        <Icon size={28} />
                      </Avatar>
                      {achievement.unlocked ? (
                        <Typography variant="body2" color="text.secondary">
                          {achievement.unlockedOn}
                        </Typography>
                      ) : (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconLock size={16} />
                          <Typography variant="body2" color="text.secondary">
                            Locked
                          </Typography>
                        </Stack>
                      )}
                    </Stack>

                    <Box>
                      <Typography variant="h5">{achievement.title}</Typography>
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        {achievement.description}
                      </Typography>
                    </Box>

                    {achievement.unlocked ? null : (
                      <Box>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            Progress
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {achievement.progress}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={achievement.progress}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
