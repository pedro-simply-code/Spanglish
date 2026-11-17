"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconAlertTriangle, IconArrowRight, IconX } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { AdminOverviewChartsPanel } from "@/features/admin/components/admin-overview-charts";
import { AdminOverviewToolbar } from "@/features/admin/components/admin-overview-toolbar";
import { LinkButton } from "@/components/ui/link-button";
import type {
  AdminAlert,
  AdminDashboardCharts,
  AdminStat,
  DashboardAuditRow,
} from "@/features/admin/types";

const auditActionLabels: Record<string, string> = {
  "auth.sign_up": "Account created",
  "auth.sign_in": "Signed in",
  "auth.sign_in_failed": "Failed sign-in",
  "auth.rate_limited": "Rate limit hit",
  "auth.email_verified": "Email verified",
  "auth.password_changed": "Password changed",
  "auth.password_reset": "Password reset",
  "auth.two_factor_enabled": "2FA enabled",
  "auth.two_factor_disabled": "2FA disabled",
  "auth.sessions_revoked": "Sessions revoked",
  "role.admin_granted": "Admin role granted",
  "role.admin_revoked": "Admin role removed",
  "email.bounced": "Email bounced",
  "profile.completed": "Onboarding completed",
};

type ExecutiveOverviewProps = {
  firstName: string;
  /** Remaining given / family name parts after the first token. */
  lastName?: string;
  stats: AdminStat[];
  charts: AdminDashboardCharts;
  alerts: AdminAlert[];
  activity: DashboardAuditRow[];
  /** Extra top spacing when the 2FA banner is not shown (e.g. already enabled). */
  topMargin?: number;
};

const severityColor = {
  info: "info" as const,
  warning: "warning" as const,
  critical: "error" as const,
};

function MetricCard({
  stat,
  accent = "primary",
}: {
  stat: AdminStat;
  accent?: "primary" | "success";
}) {
  const valueColor = accent === "success" ? "success.dark" : "primary.main";
  return (
    <Card
      elevation={9}
      sx={{
        height: "100%",
        ...(accent === "success"
          ? { borderColor: "success.light", borderWidth: 1, borderStyle: "solid" }
          : {}),
      }}
    >
      <CardContent sx={{ p: { xs: "20px", md: "24px" } }}>
        <Typography variant="subtitle2" color="text.secondary">
          {stat.label}
        </Typography>
        <Typography variant="h4" fontWeight={700} color={valueColor} mt={0.75}>
          {stat.value}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5} sx={{ lineHeight: 1.4 }}>
          {stat.helper}
        </Typography>
        {stat.href ? (
          <LinkButton
            href={stat.href}
            size="small"
            sx={{ mt: 1, px: 0 }}
            endIcon={<IconArrowRight size={14} />}
          >
            Open
          </LinkButton>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AlertRow({ alert }: { alert: AdminAlert }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
    >
      <Box flex={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle2" fontWeight={600}>
            {alert.title}
          </Typography>
          <Chip size="small" color={severityColor[alert.severity]} label={alert.severity} />
        </Stack>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {alert.detail}
        </Typography>
      </Box>
      {alert.href ? (
        <LinkButton href={alert.href} size="small" endIcon={<IconArrowRight size={14} />}>
          Open
        </LinkButton>
      ) : null}
    </Stack>
  );
}

function ActivityRow({ entry }: { entry: DashboardAuditRow }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
    >
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle2" fontWeight={600}>
            {auditActionLabels[entry.action] ?? entry.action}
          </Typography>
          {entry.severity !== "info" ? (
            <Chip size="small" color={severityColor[entry.severity]} label={entry.severity} />
          ) : null}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {entry.actor}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {entry.at}
      </Typography>
    </Stack>
  );
}

function ModalTitle({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <DialogTitle sx={{ pr: 6 }}>
      {title}
      <IconButton
        aria-label="Close"
        onClick={onClose}
        sx={{ position: "absolute", right: 12, top: 12 }}
      >
        <IconX size={18} />
      </IconButton>
    </DialogTitle>
  );
}

export function ExecutiveOverview({
  firstName,
  lastName = "",
  stats,
  charts,
  alerts,
  activity,
  topMargin = 0,
}: ExecutiveOverviewProps) {
  const welcomeName = [firstName, lastName.trim()].filter(Boolean).join(" ");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  return (
    <Box mt={topMargin}>
      <Breadcrumb
        title={`Welcome back, ${welcomeName}`}
        subtitle="Here's today's snapshot of Spanglish — revenue, enrollments, and anything that needs your attention."
      />

      <AdminOverviewToolbar
        alertCount={alerts.length}
        activityCount={activity.length}
        onOpenHealth={() => setAlertsOpen(true)}
        onOpenActivity={() => setActivityOpen(true)}
      />

      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid key={stat.id} size={{ xs: 12, sm: 6, lg: 3 }}>
            <MetricCard stat={stat} />
          </Grid>
        ))}

        <Grid size={12}>
          <AdminOverviewChartsPanel data={charts} />
        </Grid>
      </Grid>

      <Dialog open={alertsOpen} onClose={() => setAlertsOpen(false)} fullWidth maxWidth="md">
        <ModalTitle title="Platform health" onClose={() => setAlertsOpen(false)} />
        <DialogContent dividers>
          {alerts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No open alerts. Integrations, email, and security look clear from current data.
            </Typography>
          ) : (
            <Stack spacing={2.5}>
              {alerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={activityOpen} onClose={() => setActivityOpen(false)} fullWidth maxWidth="md">
        <ModalTitle title="Latest activity" onClose={() => setActivityOpen(false)} />
        <DialogContent dividers>
          {activity.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No audit events yet.
            </Typography>
          ) : (
            <Stack spacing={2.5}>
              {activity.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </Stack>
          )}
          <LinkButton
            href="/admin/audit"
            size="small"
            sx={{ mt: 2 }}
            endIcon={<IconArrowRight size={14} />}
          >
            Open full audit log
          </LinkButton>
        </DialogContent>
      </Dialog>

      <Stack direction="row" spacing={1} alignItems="center" color="text.secondary" mt={3}>
        <IconAlertTriangle size={16} />
        <Typography variant="caption">
          Platform KPIs and operations charts load from PostgreSQL. Finance trends and margin detail are on Credit ledger.
        </Typography>
      </Stack>
    </Box>
  );
}