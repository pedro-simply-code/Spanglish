"use client";

import { type ComponentType, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
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
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { SummaryBanner } from "@/components/ui/summary-banner";
import type { StudentAchievement } from "@/lib/learning-types";

const icons: Record<StudentAchievement["icon"], ComponentType<{ size?: number }>> = {
  trophy: IconTrophy,
  flame: IconFlame,
  star: IconStar,
  bolt: IconBolt,
  target: IconTargetArrow,
  medal: IconMedal,
};

const PAGE_SIZE = 5;

type Filter = "all" | "unlocked" | "locked";

type AchievementsOverviewProps = {
  achievements: StudentAchievement[];
  timeZone: string;
};

/** Badges earned from real activity, with the My classes layout. */
export function AchievementsOverview({ achievements, timeZone }: AchievementsOverviewProps) {
  const tLearn = useTranslations("student.learn.achievements");
  const format = useFormatter();
  const t = useTranslations("student");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const unlockedList = achievements
    .filter((item) => item.unlocked)
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""));
  const lockedList = achievements.filter((item) => !item.unlocked).sort((a, b) => b.progress - a.progress);
  const groups: Record<Filter, StudentAchievement[]> = {
    all: [...unlockedList, ...lockedList],
    unlocked: unlockedList,
    locked: lockedList,
  };
  const list = groups[filter];
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const total = achievements.length;
  const unlocked = unlockedList.length;
  const percent = total ? Math.round((unlocked / total) * 100) : 0;
  const next = lockedList[0] ?? null;
  const latest = unlockedList[0] ?? null;
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeZone });

  return (
    <Box>
      <Breadcrumb title={t("achievements.breadcrumbTitle")} subtitle={t("achievements.breadcrumbSubtitle")} />

      <SummaryBanner
        items={[
          { key: "unlocked", icon: IconTrophy, color: "primary", value: `${unlocked}/${total}`, label: t("achievements.summary.unlocked") },
          { key: "percent", icon: IconMedal, color: "success", value: `${percent}%`, label: t("achievements.summary.percent") },
          { key: "locked", icon: IconLock, color: "secondary", value: lockedList.length, label: t("achievements.summary.locked") },
          {
            key: "next",
            icon: IconTargetArrow,
            color: "warning",
            value: next ? `${next.progress}%` : "—",
            label: t("achievements.summary.next"),
          },
        ]}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Card elevation={9}>
              <Box sx={{ px: 2 }}>
                <Tabs
                  value={filter}
                  onChange={(_, value: Filter) => {
                    setFilter(value);
                    setPage(1);
                  }}
                  variant="scrollable"
                  allowScrollButtonsMobile
                >
                  <Tab value="all" label={t("achievements.tabs.all", { count: groups.all.length })} />
                  <Tab value="unlocked" label={t("achievements.tabs.unlocked", { count: unlocked })} />
                  <Tab value="locked" label={t("achievements.tabs.locked", { count: lockedList.length })} />
                </Tabs>
              </Box>
            </Card>

            {visible.length ? (
              <Stack spacing={2}>
                {visible.map((achievement) => {
                  const Icon = icons[achievement.icon];
                  return (
                    <Card key={achievement.id} elevation={9}>
                      <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}>
                          {/* Badge block, in the place of the date block of the class cards. */}
                          <Box
                            sx={{
                              width: { xs: "100%", sm: 72 },
                              height: { sm: 72 },
                              py: { xs: 1.25, sm: 0 },
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: achievement.unlocked ? "primary.light" : "grey.200",
                              color: achievement.unlocked ? "primary.main" : "text.disabled",
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={32} />
                          </Box>

                          <Box flexGrow={1} minWidth={0}>
                            <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
                              {achievement.unlocked ? (
                                <Chip size="small" color="success" label={t("achievements.unlockedLabel")} />
                              ) : (
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  icon={<IconLock size={14} />}
                                  label={t("achievements.locked")}
                                />
                              )}
                              {achievement.unlocked && achievement.unlockedAt ? (
                                <Chip size="small" variant="outlined" label={date(achievement.unlockedAt)} />
                              ) : null}
                            </Stack>
                            <Typography variant="h5" mt={1.25}>
                              {tLearn(`${achievement.id}.title`)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mt={0.5}>
                              {tLearn(`${achievement.id}.description`)}
                            </Typography>
                            {achievement.unlocked ? null : (
                              <Box mt={1.5} maxWidth={420}>
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
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            ) : (
              <Card elevation={9}>
                <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" }, textAlign: "center" }}>
                  <Typography color="text.secondary" py={3}>
                    {t(`achievements.empty.${filter === "unlocked" ? "unlocked" : "locked"}`)}
                  </Typography>
                </CardContent>
              </Card>
            )}

            <ListPagination
              page={current}
              total={list.length}
              pageSize={PAGE_SIZE}
              onPageChange={(value) => {
                setPage(value);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <SectionCard
              padding="15px"
              title={t("achievements.trophyCase")}
              subtitle={t("achievements.unlocked", { unlocked, total })}
            >
              <LinearProgress variant="determinate" value={percent} sx={{ height: 10, borderRadius: 5 }} />
              {latest ? (
                <Stack direction="row" spacing={1.5} alignItems="center" mt={2}>
                  <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
                    <IconTrophy size={20} />
                  </Avatar>
                  <Box minWidth={0}>
                    <Typography variant="caption" color="text.secondary">
                      {t("achievements.latest")}
                    </Typography>
                    <Typography variant="subtitle2" noWrap>
                      {tLearn(`${latest.id}.title`)}
                    </Typography>
                  </Box>
                </Stack>
              ) : null}
            </SectionCard>

            {next ? (
              <SectionCard padding="15px" title={t("achievements.nextTitle")} subtitle={t("achievements.nextSubtitle")}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {tLearn(`${next.id}.title`)}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1.5}>
                  {tLearn(`${next.id}.description`)}
                </Typography>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    {t("common.progress")}
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
