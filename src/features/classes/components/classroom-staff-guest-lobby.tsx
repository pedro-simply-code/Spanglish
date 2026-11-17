"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { createStaffGuestJoinLinkAction } from "@/features/classes/classroom-actions";
import { useAppToast } from "@/lib/use-app-toast";

type ClassroomStaffGuestLobbyProps = {
  classId: string;
  topic: string;
};

/**
 * Managers and admins are not hosts. They join via a signed staff guest link
 * (student UI, self-serve mic/camera/screen — no host toolbar).
 */
export function ClassroomStaffGuestLobby({ classId, topic }: ClassroomStaffGuestLobbyProps) {
  const { showError } = useAppToast();
  const [busy, setBusy] = useState(false);

  const join = async () => {
    setBusy(true);
    try {
      const result = await createStaffGuestJoinLinkAction(classId);
      if (result.ok && result.url) {
        window.location.assign(result.url);
        return;
      }
      showError({ message: result.message });
    } finally {
      setBusy(false);
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
        p: 3,
        textAlign: "center",
      }}
    >
      <Stack spacing={2} maxWidth={440}>
        <Typography variant="h5" color="#fff">
          Staff guest access
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
          {topic}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.65)" }}>
          Host controls are only for the teacher who runs this class. As manager or admin, join
          with a staff guest link — the same toolbar and icons as a student (including raise hand).
          You may use mic, camera, and screen share without asking; mute-all and audience mic lock do
          not apply to you. To host a class, switch to the Teacher dashboard.
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
          View-only visitors should use the guest link copied from the teacher.
        </Typography>
        <Button variant="contained" onClick={() => void join()} disabled={busy}>
          {busy ? "Preparing link…" : "Join as staff guest"}
        </Button>
      </Stack>
    </Box>
  );
}