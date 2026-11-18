"use client";

import type { ComponentType } from "react";
import { useFormatter, useTranslations } from "next-intl";
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
import type { StudentAchievement } from "@/lib/learning-types";

const icons: Record<StudentAchievement["icon"], ComponentType<{ size?: number }>> = {
  trophy: IconTrophy,
  flame: IconFlame,
  star: IconStar,
  bolt: IconBolt,
  target: IconTargetArrow,
  medal: IconMedal,
};

type AchievementsOverviewProps = {
  achievements: StudentAchievement[];
  timeZone: string;
};

/** Badges earned from real activity: classes, weeks in a row, hours, words, practice. */
export function AchievementsOverview({ achievements, timeZone }: AchievementsOverviewProps) {
  const tLearn = useTranslations("student.learn.achievements");
  const format = useFormatter();
  const t = useTranslations("student");
  const unlocked = achievements.filter((item) => item.unlocked).length;

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("achievements.breadcrumbTitle")}
        subtitle={t("achievements.breadcrumbSubtitle")}
      />

      <Card elevation={9} sx={{ mb: 3 }}>
        <CardContent sx={{ p: "30px" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={3}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h5">{t("achievements.trophyCase")}</Typography>
              <Typography variant="subtitle2" color="text.secondary">
                {t("achievements.unlocked", {
                  unlocked,
                  total: achievements.length,
                })}
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
                          {achievement.unlockedAt
                            ? format.dateTime(new Date(achievement.unlockedAt), {
                                dateStyle: "medium",
                                timeZone,
                              })
                            : t("achievements.unlockedLabel")}
                        </Typography>
                      ) : (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconLock size={16} />
                          <Typography variant="body2" color="text.secondary">
                            {t("achievements.locked")}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>

                    <Box>
                      <Typography variant="h5">
                        {tLearn(`${achievement.id}.title`)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        {tLearn(`${achievement.id}.description`)}
                      </Typography>
                    </Box>

                    {achievement.unlocked ? null : (
                      <Box>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            {t("common.progress")}
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {achievement.current}/{achievement.goal}
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
