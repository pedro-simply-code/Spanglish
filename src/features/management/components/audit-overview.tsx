import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconHistory, IconShieldExclamation } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { adminAuditActionKeys } from "@/features/admin/components/audit-action-keys";
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

const severityColor = {
  info: "default",
  warning: "warning",
  critical: "error",
} as const;

function describe(
  entry: AuditEntryView,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  const who = entry.actorName || entry.actorEmail;
  const email = typeof entry.metadata?.email === "string" ? entry.metadata.email : null;
  const method = typeof entry.metadata?.method === "string" ? entry.metadata.method : null;
  return [
    who ?? email ?? t("audit.unknownAccount"),
    method ? t("management.audit.via", { method }) : null,
    entry.ipAddress,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function AuditOverview({ entries }: { entries: AuditEntryView[] }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const warnings = entries.filter((entry) => entry.severity !== "info").length;

  return (
    <Box>
      <Breadcrumb
        title={t("common.page.audit")}
        subtitle={t("management.audit.subtitle")}
        items={[
          { title: t("common.admin"), to: "/admin" },
          { title: t("common.section.compliance") },
          { title: t("common.page.audit") },
        ]}
      />

      <SectionCard
        title={t("management.audit.recentEvents")}
        subtitle={t("management.audit.recentEventsSubtitle", {
          count: entries.length,
          warnings,
        })}
      >
        {entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t("management.audit.empty")}
          </Typography>
        ) : (
          <Stack
            spacing={2}
            divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}
          >
            {entries.map((entry) => {
              const actionKey = adminAuditActionKeys[entry.action];
              return (
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
                        {actionKey ? t(actionKey) : entry.action}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {describe(entry, t)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                    <Chip
                      label={t(`common.severity.${entry.severity}`)}
                      size="small"
                      color={severityColor[entry.severity]}
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(entry.createdAt).toLocaleString(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "UTC",
                      })}{" "}
                      UTC
                    </Typography>
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        )}
      </SectionCard>
    </Box>
  );
}
