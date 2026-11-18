"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("classroom");
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
          {t("lobby.staff.title")}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
          {topic}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.65)" }}>
          {t("lobby.staff.description")}
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
          {t("lobby.staff.viewOnlyHint")}
        </Typography>
        <Button variant="contained" onClick={() => void join()} disabled={busy}>
          {busy ? t("lobby.staff.preparing") : t("lobby.staff.join")}
        </Button>
      </Stack>
    </Box>
  );
}