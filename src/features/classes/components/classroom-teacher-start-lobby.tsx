"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { startClassLiveSessionAction } from "@/features/classes/classroom-actions";
import { useAppToast } from "@/lib/use-app-toast";

type ClassroomTeacherStartLobbyProps = {
  classId: string;
  topic: string;
};

export function ClassroomTeacherStartLobby({
  classId,
  topic,
}: ClassroomTeacherStartLobbyProps) {
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, setPending] = useState(false);

  const start = async () => {
    setPending(true);
    const result = await startClassLiveSessionAction(classId);
    setPending(false);
    if (result.ok) {
      showSuccess({ message: result.message });
      router.refresh();
    } else {
      showError({ message: result.message });
    }
  };

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
      <Stack spacing={2} alignItems="center" maxWidth={440} textAlign="center">
        <Typography variant="h6">{topic}</Typography>
        <Typography variant="body2" color="rgba(255,255,255,0.75)">
          You are the teacher for this class. Start the live session so enrolled students can
          join the call. Until you start, students only see a waiting screen.
        </Typography>
        <Button variant="contained" size="large" disabled={pending} onClick={() => void start()}>
          {pending ? "Starting…" : "Start live class"}
        </Button>
      </Stack>
    </Box>
  );
}