"use client";

import { useEffect } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getClassLiveSessionStatusAction } from "@/features/classes/classroom-actions";

type ClassroomAwaitTeacherLobbyProps = {
  classId: string;
  topic: string;
  teacherName: string;
  /** The teacher closed the call; it can still be reopened while the class is on. */
  ended?: boolean;
};

export function ClassroomAwaitTeacherLobby({
  classId,
  topic,
  teacherName,
  ended = false,
}: ClassroomAwaitTeacherLobbyProps) {
  const router = useRouter();
  const t = useTranslations("classroom");

  useEffect(() => {
    const check = () => {
      void getClassLiveSessionStatusAction(classId, { entering: true }).then(({ active }) => {
        if (active) router.refresh();
      });
    };
    check();
    const poll = window.setInterval(check, 3000);
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
          {ended
            ? t("lobby.await.teacherEnded", { teacherName })
            : t("lobby.await.teacherNotStarted", { teacherName })}
        </Typography>
        {ended ? null : (
          <Stack spacing={1} alignItems="center">
            <CircularProgress size={28} sx={{ color: "#fff" }} />
            <Typography variant="body2">{t("lobby.await.waitingForTeacher")}</Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}