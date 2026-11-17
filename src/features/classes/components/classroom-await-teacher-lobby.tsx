"use client";

import { useEffect } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { getClassLiveSessionStatusAction } from "@/features/classes/classroom-actions";

type ClassroomAwaitTeacherLobbyProps = {
  classId: string;
  topic: string;
  teacherName: string;
};

export function ClassroomAwaitTeacherLobby({
  classId,
  topic,
  teacherName,
}: ClassroomAwaitTeacherLobbyProps) {
  const router = useRouter();

  useEffect(() => {
    const check = () => {
      void getClassLiveSessionStatusAction(classId).then(({ active }) => {
        if (active) router.refresh();
      });
    };
    check();
    const poll = window.setInterval(check, 1500);
    return () => window.clearInterval(poll);
  }, [classId, router]);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#17181C",
        color: "#fff",
        px: 2,
      }}
    >
      <Stack spacing={2} alignItems="center" maxWidth={420} textAlign="center">
        <Typography variant="h6">{topic}</Typography>
        <Typography variant="body2" color="rgba(255,255,255,0.7)">
          {teacherName} has not started the live class yet. You can enter the classroom during
          the join window, but the video call opens once the teacher starts it.
        </Typography>
        <Stack spacing={1} alignItems="center">
          <CircularProgress size={28} sx={{ color: "#fff" }} />
          <Typography variant="body2">Waiting for the teacher to start…</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}