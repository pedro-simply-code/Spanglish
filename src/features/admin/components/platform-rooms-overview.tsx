"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
  const rows = [
    {
      key: "waitingRoom",
      label: "Waiting room",
      value: policy.waitingRoom,
      description: "Students wait until the teacher admits them (when LiveKit supports it).",
    },
    {
      key: "teacherStarts",
      label: "Teacher starts session",
      value: policy.teacherStartsSession,
      description: "Classroom stays locked until the assigned teacher starts the live session.",
    },
    {
      key: "relaxJoin",
      label: "Relax join window",
      value: policy.relaxJoinWindow,
      description: "Allow joining outside the scheduled window (keep off in production).",
    },
  ];

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Classroom defaults"
        subtitle="Live session policy from environment (not per-class overrides yet)."
        items={adminBreadcrumb("Platform", "Classroom", "/admin/platform/rooms")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        Meeting provider: <strong>{policy.meetingProvider}</strong>. Operational room list for
        managers stays on the manager dashboard.
      </Alert>

      <SectionCard title="Policy flags" subtitle="Change via deployment env, then redeploy">
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
                label={row.value ? "Enabled" : "Disabled"}
              />
            </Stack>
          ))}
        </Stack>
      </SectionCard>
    </Box>
  );
}