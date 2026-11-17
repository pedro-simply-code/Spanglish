"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import { adminBreadcrumb } from "@/features/admin/components/admin-breadcrumb-items";
import type { PayoutBatch } from "@/features/admin/types";
import type { TeacherEarningsRow } from "@/features/admin";

const statusChip = {
  draft: { label: "Draft", color: "default" as const },
  "awaiting-approval": { label: "Awaiting approval", color: "warning" as const },
  paid: { label: "Paid", color: "success" as const },
};

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function FinancePayoutsOverview({
  batches,
  teachers = [],
}: {
  batches: PayoutBatch[];
  teachers?: TeacherEarningsRow[];
}) {
  const pending = batches.filter((batch) => batch.status === "awaiting-approval");

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Payout approvals"
        subtitle="Managers submit periods; admin approves and executes with re-authentication."
        items={adminBreadcrumb("Finance", "Payouts", "/admin/finance/payouts")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {pending.length} batch(es) waiting. Amounts are estimated from delivered classes (55% of
        tuition) until Stripe Connect and <code>payout_batches</code> ship. Approval still requires
        password or TOTP.
      </Alert>

      {teachers.length > 0 ? (
        <Box sx={{ mb: 3 }}>
        <SectionCard
          title="By teacher"
          subtitle="Delivered classes in the database"
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Teacher</TableCell>
                <TableCell align="right">Classes</TableCell>
                <TableCell align="right">Tuition (gross)</TableCell>
                <TableCell align="right">Payout (est.)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teachers.map((row) => (
                <TableRow key={row.teacherName} hover>
                  <TableCell>{row.teacherName}</TableCell>
                  <TableCell align="right">{row.classesTaught}</TableCell>
                  <TableCell align="right">{formatUsd(row.grossUsd)}</TableCell>
                  <TableCell align="right">{formatUsd(row.payoutUsd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
        </Box>
      ) : null}

      <SectionCard title="Batches" subtitle="Biweekly or monthly teacher settlements">
        {batches.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No payout batches in the database. Managers will submit drafts here once payout_batches
            exists.
          </Typography>
        ) : null}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Period</TableCell>
              <TableCell>Manager</TableCell>
              <TableCell align="right">Teachers</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batches.map((batch) => {
              const chip = statusChip[batch.status];
              return (
                <TableRow key={batch.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{batch.period}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {batch.id}
                    </Typography>
                  </TableCell>
                  <TableCell>{batch.manager}</TableCell>
                  <TableCell align="right">{batch.teachers}</TableCell>
                  <TableCell align="right">{batch.totalUsd}</TableCell>
                  <TableCell>
                    <Chip size="small" color={chip.color} label={chip.label} />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                      disabled={batch.status !== "awaiting-approval"}
                    >
                      Approve & pay
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>
    </Box>
  );
}