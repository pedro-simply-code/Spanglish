"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import {
  getClassroomAdmissionStatusAction,
  requestClassroomAdmissionAction,
} from "@/features/classes/classroom-actions";

type ClassroomWaitingLobbyProps = {
  classId: string;
  topic: string;
};

export function ClassroomWaitingLobby({ classId, topic }: ClassroomWaitingLobbyProps) {
  const router = useRouter();
  const [requested, setRequested] = useState(false);
  const [denied, setDenied] = useState(false);

  const request = async () => {
    const result = await requestClassroomAdmissionAction(classId);
    if (result.ok) setRequested(true);
  };

  useEffect(() => {
    if (!requested) return;
    const poll = window.setInterval(() => {
      void getClassroomAdmissionStatusAction(classId).then(({ status }) => {
        if (status === "approved") {
          router.refresh();
        }
        if (status === "denied") {
          setDenied(true);
        }
      });
    }, 2500);
    return () => window.clearInterval(poll);
  }, [classId, requested, router]);

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
          Waiting room is on. The teacher will admit you before you join the LiveKit call.
        </Typography>
        {denied ? (
          <Typography color="warning.light">The teacher declined this join request.</Typography>
        ) : requested ? (
          <Stack spacing={1} alignItems="center">
            <CircularProgress size={28} sx={{ color: "#fff" }} />
            <Typography variant="body2">Waiting for admission…</Typography>
          </Stack>
        ) : (
          <Button variant="contained" onClick={() => void request()}>
            Ask to join
          </Button>
        )}
      </Stack>
    </Box>
  );
}