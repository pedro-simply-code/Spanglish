"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { IconDeviceGamepad2, IconFlame, IconSchool, IconTrophy } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { savePracticeResultAction } from "@/features/materials/actions";
import { LessonPlayer } from "@/features/materials/components/lesson-player";
import { PracticeGames } from "@/features/materials/components/practice-games";
import { DEFAULT_LESSON, type LessonOutcome, type LessonSettings } from "@/lib/lesson";
import type { PracticeItem } from "@/lib/practice-games";

export type PracticeStatsView = { attempts: number; bestPercent: number; totalXp: number };

/**
 * The practice set as students see it: the Duolingo-style lesson first, the
 * single games under "More games". Results are saved only when `materialId`
 * is set and `save` is on (students on a material, not teacher previews).
 */
export function PracticeArea({
  items,
  settings = DEFAULT_LESSON,
  materialId,
  save = false,
  stats: initialStats,
  title,
}: {
  items: PracticeItem[];
  settings?: LessonSettings;
  materialId?: string;
  save?: boolean;
  stats?: PracticeStatsView;
  title?: string;
}) {
  const t = useTranslations("educator.materials.lesson");
  const [tab, setTab] = useState<"lesson" | "games">("lesson");
  const [stats, setStats] = useState(initialStats);
  const [, startTransition] = useTransition();

  const onFinish = (outcome: LessonOutcome) => {
    if (!save || !materialId) return;
    startTransition(async () => {
      const result = await savePracticeResultAction(materialId, outcome);
      if (result.ok) setStats(result.stats);
    });
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        mb={2}
      >
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ minHeight: 40 }}>
          <Tab value="lesson" label={t("tabLesson")} icon={<IconSchool size={18} />} iconPosition="start" sx={{ minHeight: 40 }} />
          <Tab value="games" label={t("tabGames")} icon={<IconDeviceGamepad2 size={18} />} iconPosition="start" sx={{ minHeight: 40 }} />
        </Tabs>
        {stats && stats.attempts > 0 ? (
          <Stack direction="row" spacing={1}>
            <Chip size="small" icon={<IconTrophy size={16} />} label={t("best", { percent: stats.bestPercent })} color="success" variant="outlined" />
            <Chip size="small" icon={<IconFlame size={16} />} label={t("totalXp", { xp: stats.totalXp })} color="warning" variant="outlined" />
            <Chip size="small" label={t("attempts", { count: stats.attempts })} variant="outlined" />
          </Stack>
        ) : null}
      </Stack>
      {tab === "lesson" ? (
        <LessonPlayer items={items} settings={settings} onFinish={onFinish} title={title} />
      ) : (
        <PracticeGames items={items} />
      )}
    </Box>
  );
}
