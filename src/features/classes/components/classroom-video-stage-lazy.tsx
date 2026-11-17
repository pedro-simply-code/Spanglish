"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ClassroomVideoStageProps } from "@/features/classes/components/classroom-video-stage";

const ClassroomVideoStageClient = dynamic(
  () => import("@/features/classes/components/classroom-video-stage"),
  {
    ssr: false,
    loading: () => (
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
        <Typography variant="body2">Loading classroom video…</Typography>
      </Stack>
    ),
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