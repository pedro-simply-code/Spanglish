"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import { adminBreadcrumb } from "@/features/admin/components/admin-breadcrumb-items";
import type { EmailHealthRow } from "@/features/admin/types";

type PlatformEmailOverviewProps = {
  emailProvider: string;
  health: EmailHealthRow[];
};

const statusColor = {
  ok: "success" as const,
  watch: "warning" as const,
  action: "error" as const,
};

export function PlatformEmailOverview({ emailProvider, health }: PlatformEmailOverviewProps) {
  return (
    <Box mt={3}>
      <Breadcrumb
        title="Email deliverability"
        subtitle="SMTP/Postmark is for login verification codes only. Other notices go to in-app Email."
        items={adminBreadcrumb("Platform", "Email", "/admin/platform/email")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        Provider: <strong>{emailProvider}</strong> (sign-in / verify / password codes). Academy and
        class notices are delivered in <strong>Email</strong> inside the app. Bounces update{" "}
        <code>users.email_bounced_at</code> via the Postmark webhook when configured.
      </Alert>

      <SectionCard title="Health" subtitle="From users and audit_logs">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Metric</TableCell>
              <TableCell align="right">Value</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {health.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.metric}</TableCell>
                <TableCell align="right">
                  <Typography fontWeight={600}>{row.value}</Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" color={statusColor[row.status]} label={row.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Stack mt={2}>
          <Typography variant="body2" color="text.secondary">
            Configure SPF, DKIM, and DMARC on your sending domain before switching production
            traffic to Postmark.
          </Typography>
        </Stack>
      </SectionCard>
    </Box>
  );
}