"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import { adminBreadcrumb } from "@/features/admin/components/admin-breadcrumb-items";

export type ClassroomPolicyFlags = {
  waitingRoom: boolean;
  teacherStartsSession: boolean;
  relaxJoinWindow: boolean;
  meetingProvider: string;
};

export function PlatformRoomsOverview({ policy }: { policy: ClassroomPolicyFlags }) {
  const t = useTranslations("admin");
  const rows = [
    {
      key: "waitingRoom",
      label: t("platform.rooms.waitingRoom"),
      value: policy.waitingRoom,
      description: t("platform.rooms.waitingRoomDetail"),
    },
    {
      key: "teacherStarts",
      label: t("platform.rooms.teacherStarts"),
      value: policy.teacherStartsSession,
      description: t("platform.rooms.teacherStartsDetail"),
    },
    {
      key: "relaxJoin",
      label: t("platform.rooms.relaxJoin"),
      value: policy.relaxJoinWindow,
      description: t("platform.rooms.relaxJoinDetail"),
    },
  ];

  return (
    <Box>
      <Breadcrumb
        title={t("common.page.classroomDefaults")}
        subtitle={t("platform.rooms.subtitle")}
        items={adminBreadcrumb(t, t("common.section.platform"), t("common.page.classroom"), "/admin/platform/rooms")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {t("platform.rooms.notice", { provider: policy.meetingProvider })}
      </Alert>

      <SectionCard
        title={t("platform.rooms.policyFlags")}
        subtitle={t("platform.rooms.policyFlagsSubtitle")}
      >
        <Stack spacing={2} divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
          {rows.map((row) => (
            <Stack
              key={row.key}
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {row.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {row.description}
                </Typography>
              </Box>
              <Chip
                size="small"
                color={row.value ? "warning" : "success"}
                label={t(row.value ? "common.enabled" : "common.disabled")}
              />
            </Stack>
          ))}
        </Stack>
      </SectionCard>
    </Box>
  );
}
