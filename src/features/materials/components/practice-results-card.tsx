import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getLocale, getTranslations } from "next-intl/server";
import { SectionCard } from "@/components/ui/section-card";
import { formatMaterialDateTime } from "@/features/materials/format";

export type PracticeResultRow = {
  studentId: string;
  name: string;
  attempts: number;
  bestPercent: number;
  lastPercent: number;
  totalXp: number;
  lastAt: string;
};

/** Teacher view: how each student is doing on this practice set. */
export async function PracticeResultsCard({ results }: { results: PracticeResultRow[] }) {
  const t = await getTranslations("educator.materials.lesson");
  const locale = await getLocale();
  return (
    <SectionCard title={t("resultsTitle")} subtitle={t("resultsSubtitle", { count: results.length })}>
      {results.length === 0 ? (
        <Typography color="text.secondary">{t("resultsEmpty")}</Typography>
      ) : (
        <Stack spacing={2}>
          {results.map((row) => (
            <Stack key={row.studentId} direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ width: 36, height: 36 }}>{row.name.slice(0, 1).toUpperCase()}</Avatar>
              <Box flex={1} minWidth={0}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Typography fontWeight={600} noWrap>
                    {row.name}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color={row.bestPercent >= 80 ? "success.main" : "text.primary"}>
                    {t("best", { percent: row.bestPercent })}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={row.bestPercent}
                  color={row.bestPercent >= 80 ? "success" : row.bestPercent >= 50 ? "warning" : "error"}
                  sx={{ height: 6, borderRadius: 3, my: 0.75 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {t("resultsLine", {
                    count: row.attempts,
                    last: row.lastPercent,
                    xp: row.totalXp,
                    date: formatMaterialDateTime(row.lastAt, locale),
                  })}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
