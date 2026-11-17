import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconHistory, IconShieldExclamation } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";

export type AuditEntryView = {
  id: string;
  action: string;
  severity: "info" | "warning" | "critical";
  actorEmail: string | null;
  actorName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const actionLabels: Record<string, string> = {
  "auth.sign_up": "Account created",
  "auth.sign_in": "Signed in",
  "auth.sign_in_failed": "Failed sign-in",
  "auth.rate_limited": "Rate limit hit",
  "auth.email_verified": "Email verified",
  "auth.password_changed": "Password changed",
  "auth.password_reset": "Password reset by email code",
  "auth.password_created": "Password added",
  "auth.two_factor_enabled": "2FA turned on",
  "auth.two_factor_disabled": "2FA turned off",
  "auth.two_factor_backup_codes_regenerated": "New 2FA backup codes",
  "auth.two_factor_lockout": "2FA locked after failed codes",
  "auth.sessions_revoked": "Devices signed out",
  "auth.sign_out": "Signed out",
  "profile.completed": "Onboarding completed",
  "profile.updated": "Profile updated",
  "email.bounced": "Email bounced",
  "role.admin_granted": "Admin role granted",
  "role.admin_revoked": "Admin role removed",
  "class.booked": "Class booked",
  "class.canceled": "Class canceled",
  "class.rescheduled": "Class rescheduled",
  "order.paid": "Package purchased",
  "order.amount_mismatch": "Stripe amount did not match the order",
  "teacher.stripe_connected": "Teacher connected Stripe",
  "payout.stripe_sent": "Payout sent with Stripe",
  "payout.stripe_failed": "Stripe transfer failed",
  "credits.granted": "Credits changed by staff",
  "pair.created": "Students paired",
  "pair.ended": "Pair ended",
  "availability.updated": "Availability updated",
  "recording.saved": "Recording saved",
  "teacher.applied": "Teacher application sent",
  "teacher.approved": "Teacher application approved",
  "teacher.rejected": "Teacher application rejected",
  "class.rated": "Class rated",
  "material.submitted": "Material sent for review",
  "material.approved": "Material approved",
  "material.rejected": "Material rejected",
  "payout.settings_changed": "Teacher rates changed",
  "payout.created": "Payout prepared",
  "payout.approved": "Payout approved",
  "payout.rejected": "Payout rejected",
  "payout.paid": "Payout marked as paid",
};

const severityColor = {
  info: "default",
  warning: "warning",
  critical: "error",
} as const;

function describe(entry: AuditEntryView) {
  const who = entry.actorName || entry.actorEmail;
  const email = typeof entry.metadata?.email === "string" ? entry.metadata.email : null;
  const method = typeof entry.metadata?.method === "string" ? entry.metadata.method : null;
  return [who ?? email ?? "Unknown account", method ? `via ${method}` : null, entry.ipAddress]
    .filter(Boolean)
    .join(" · ");
}

export function AuditOverview({ entries }: { entries: AuditEntryView[] }) {
  const warnings = entries.filter((entry) => entry.severity !== "info").length;

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Audit log"
        subtitle="Sign-ins, password and two-factor changes, rate limits, and other security events."
        items={[
          { title: "Admin", to: "/admin" },
          { title: "Compliance" },
          { title: "Audit log" },
        ]}
      />

      <SectionCard
        title="Recent events"
        subtitle={`Latest ${entries.length} events · ${warnings} warnings`}
      >
        {entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No events yet. Sign-ins and security changes appear here.
          </Typography>
        ) : (
          <Stack
            spacing={2}
            divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}
          >
            {entries.map((entry) => (
              <Stack
                key={entry.id}
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Stack direction="row" spacing={2} alignItems="center" minWidth={0}>
                  <Avatar
                    sx={{
                      width: 38,
                      height: 38,
                      bgcolor: entry.severity === "info" ? "primary.light" : "warning.light",
                      color: entry.severity === "info" ? "primary.main" : "warning.main",
                    }}
                  >
                    {entry.severity === "info" ? (
                      <IconHistory size={18} />
                    ) : (
                      <IconShieldExclamation size={18} />
                    )}
                  </Avatar>
                  <Box minWidth={0}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {actionLabels[entry.action] ?? entry.action}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {describe(entry)}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                  <Chip
                    label={entry.severity}
                    size="small"
                    color={severityColor[entry.severity]}
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(entry.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "UTC",
                    })}{" "}
                    UTC
                  </Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}
      </SectionCard>
    </Box>
  );
}
