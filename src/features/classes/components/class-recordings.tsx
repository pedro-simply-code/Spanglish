"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconVideo } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/section-card";
import { RecordingVideo } from "@/components/ui/recording-player";

export type ClassRecordingItem = {
  id: string;
  status: "recording" | "uploading" | "ready" | "failed";
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

function sizeLabel(bytes: number | null) {
  if (!bytes) return null;
  return bytes >= 1024 * 1024 * 1024
    ? `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    : `${Math.max(1, Math.round(bytes / 1024 / 1024))} MB`;
}

/** The class's own recordings, playable right on the class page. */
export function ClassRecordings({
  recordings,
  timeZone,
}: {
  recordings: ClassRecordingItem[];
  timeZone?: string;
}) {
  const t = useTranslations("student");
  const format = useFormatter();
  if (!recordings.length) return null;

  const ready = recordings.filter((item) => item.status === "ready");
  const processing = recordings.length - ready.length;

  return (
    <Box id="class-recording">
      <SectionCard
        title={t("classes.detail.recordingsTitle")}
        subtitle={t("classes.detail.recordingsSubtitle")}
        action={<IconVideo size={20} />}
      >
        <Stack spacing={3}>
          {ready.map((item, index) => (
            <Box key={item.id}>
              {ready.length > 1 ? (
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  {t("classes.detail.recordingPart", { part: index + 1 })}
                </Typography>
              ) : null}
              <RecordingVideo recordingId={item.id} />
              <Stack direction="row" spacing={1.5} alignItems="center" mt={1} flexWrap="wrap" useFlexGap>
                <Typography variant="caption" color="text.secondary">
                  {format.dateTime(new Date(item.createdAt), { dateStyle: "medium", timeStyle: "short", timeZone })}
                  {sizeLabel(item.sizeBytes) ? ` · ${sizeLabel(item.sizeBytes)}` : ""}
                </Typography>
              </Stack>
            </Box>
          ))}
          {processing ? (
            <Chip
              color="warning"
              variant="outlined"
              sx={{ alignSelf: "flex-start" }}
              label={t("classes.detail.recordingProcessing", { count: processing })}
            />
          ) : null}
        </Stack>
      </SectionCard>
    </Box>
  );
}
