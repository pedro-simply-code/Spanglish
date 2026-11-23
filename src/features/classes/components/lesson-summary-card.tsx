"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconRefresh, IconSparkles } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/section-card";
import { regenerateLessonSummaryAction } from "@/features/classes/actions";
import type { LessonSummaryView } from "@/lib/lesson-summary";
import { useAppToast } from "@/lib/use-app-toast";

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="subtitle2" fontWeight={700} mb={0.75}>
      {children}
    </Typography>
  );
}

/**
 * Claude's summary of the class (from the live transcript), for the teacher
 * and the student, in the viewer's language. The teacher can ask for it again.
 */
export function LessonSummaryCard({
  summary,
  classId,
  canRegenerate,
  classEnded,
}: {
  summary: LessonSummaryView | null;
  classId: string;
  canRegenerate: boolean;
  /** Before the class ends there is nothing to show (no card at all). */
  classEnded: boolean;
}) {
  const t = useTranslations("student.classes.summary");
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();

  if (!classEnded && !summary) return null;

  const regenerate = () =>
    startTransition(async () => {
      const result = await regenerateLessonSummaryAction(classId);
      if (result.ok) showSuccess({ message: result.message });
      else showError({ message: result.message });
      router.refresh();
    });

  const content = summary?.status === "ready" ? summary.content : null;
  const status = !summary ? "none" : summary.status === "ready" && !content ? "failed" : summary.status;

  return (
    <SectionCard
      title={t("title")}
      subtitle={t("subtitle")}
      action={
        canRegenerate && status !== "pending" ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconRefresh size={16} />}
            disabled={pending}
            onClick={regenerate}
          >
            {pending ? t("regenerating") : t("regenerate")}
          </Button>
        ) : undefined
      }
    >
      {content ? (
        <Stack spacing={2.5}>
          <Box>
            <Heading>{t("overview")}</Heading>
            <Typography variant="body2" color="text.secondary">
              {content.overview}
            </Typography>
          </Box>

          {content.topics.length ? (
            <Box>
              <Heading>{t("topics")}</Heading>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {content.topics.map((topic) => (
                  <Chip key={topic} size="small" label={topic} />
                ))}
              </Stack>
            </Box>
          ) : null}

          {content.vocabulary.length ? (
            <Box>
              <Heading>{t("vocabulary")}</Heading>
              <Stack spacing={0.5}>
                {content.vocabulary.map((word) => (
                  <Typography key={word.term} variant="body2">
                    <Box component="span" fontWeight={600}>
                      {word.term}
                    </Box>
                    <Box component="span" color="text.secondary">
                      {" "}
                      — {word.meaning}
                    </Box>
                  </Typography>
                ))}
              </Stack>
            </Box>
          ) : null}

          {content.corrections.length ? (
            <Box>
              <Heading>{t("corrections")}</Heading>
              <Stack spacing={1}>
                {content.corrections.map((item) => (
                  <Box key={item.said} sx={{ p: 1.25, borderRadius: 1, bgcolor: "grey.100" }}>
                    <Typography variant="body2" color="text.secondary">
                      {t("said")}: <s>{item.said}</s>
                    </Typography>
                    <Typography variant="body2" color="success.dark" fontWeight={600}>
                      {t("better")}: {item.better}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          ) : null}

          {content.nextSteps.length ? (
            <Box>
              <Heading>{t("nextSteps")}</Heading>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {content.nextSteps.map((step) => (
                  <Typography key={step} component="li" variant="body2" color="text.secondary">
                    {step}
                  </Typography>
                ))}
              </Box>
            </Box>
          ) : null}
        </Stack>
      ) : (
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ color: "primary.main", display: "flex" }}>
            <IconSparkles size={18} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t(status)}
          </Typography>
        </Stack>
      )}
    </SectionCard>
  );
}
