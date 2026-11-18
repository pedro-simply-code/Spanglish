"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import type { ClassroomVideoStageProps } from "@/features/classes/components/classroom-video-stage";

function ClassroomVideoLoading() {
  const t = useTranslations("classroom");
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1}
      sx={{
        position: "absolute",
        inset: 0,
        bgcolor: "#17181C",
        color: "#fff",
      }}
    >
      <CircularProgress size={32} sx={{ color: "#fff" }} />
      <Typography variant="body2">{t("stage.loadingVideo")}</Typography>
    </Stack>
  );
}

const ClassroomVideoStageClient = dynamic(
  () => import("@/features/classes/components/classroom-video-stage"),
  {
    ssr: false,
    loading: ClassroomVideoLoading,
  },
);

/**
 * LiveKit and getUserMedia must not run during SSR. Lazy-load the stage on the client only.
 */
export function ClassroomVideoStageLazy(props: ClassroomVideoStageProps) {
  return (
    <Box sx={{ position: "absolute", inset: 0 }}>
      <ClassroomVideoStageClient {...props} />
    </Box>
  );
}
