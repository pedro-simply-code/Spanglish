"use client";

import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { PayoutBatchItem } from "@/features/payouts/components/payouts-board";
import { PayoutBatchCycleStepper } from "@/features/payouts/components/payout-batch-cycle-stepper";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const statusChip = {
  awaiting_approval: { label: "Awaiting approval", color: "warning" as const },
  approved: { label: "Approved · to pay", color: "info" as const },
  paid: { label: "Paid", color: "success" as const },
  rejected: { label: "Rejected", color: "default" as const },
};

const periodLabel = (batch: PayoutBatchItem) =>
  `${dateFormat.format(new Date(batch.periodStart))} – ${dateFormat.format(
    new Date(new Date(batch.periodEnd).getTime() - 1),
  )}`;

type Props = {
  open: boolean;
  batch: PayoutBatchItem | null;
  mode: "manager" | "admin";
  pending: boolean;
  stripe: { enabled: boolean; testMode: boolean; manualTransferEnabled?: boolean };
  processingWindow: string;
  note: string;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPayStripe: () => void;
  onMarkPaid: () => void;
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} textAlign="right">
        {value}
      </Typography>
    </Stack>
  );
}

export function PayoutBatchDetailDialog({
  open,
  batch,
  mode,
  pending,
  stripe,
  processingWindow,
  note,
  onNoteChange,
  onClose,
  onApprove,
  onReject,
  onPayStripe,
  onMarkPaid,
}: Props) {
  if (!batch) return null;
  const chip = statusChip[batch.status];
  const title =
    batch.initiatedBy === "teacher"
      ? `Payout request · ${batch.lines[0]?.teacherName ?? "Teacher"}`
      : `Monthly payout · ${periodLabel(batch)}`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h5" component="span">
            {title}
          </Typography>
          {batch.initiatedBy === "teacher" ? (
            <Chip size="small" variant="outlined" color="secondary" label="Teacher request" />
          ) : (
            <Chip size="small" variant="outlined" label="Manager batch" />
          )}
          <Chip size="small" color={chip.color} label={chip.label} />
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Stack spacing={1}>
            <MetaRow label="Total" value={money(batch.totalCents)} />
            <MetaRow label="Classes" value={String(batch.classCount)} />
            <MetaRow
              label={batch.initiatedBy === "teacher" ? "Requested by" : "Prepared by"}
              value={batch.createdByName ?? "—"}
            />
            {batch.initiatedBy === "manager" ? (
              <MetaRow label="Period" value={periodLabel(batch)} />
            ) : null}
            {batch.approvedByName ? <MetaRow label="Reviewed by" value={batch.approvedByName} /> : null}
            {batch.paidReference ? <MetaRow label="Payment reference" value={batch.paidReference} /> : null}
            {batch.rejectedReason ? (
              <Typography variant="body2" color="error.main">
                Rejected: {batch.rejectedReason}
              </Typography>
            ) : null}
          </Stack>

          <PayoutBatchCycleStepper batch={batch} />

          <Divider />

          <Typography variant="subtitle2">Teachers in this batch</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Teacher</TableCell>
                <TableCell align="right">Classes</TableCell>
                <TableCell align="right">Amount</TableCell>
                {stripe.enabled ? <TableCell align="right">Stripe</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {batch.lines.map((line) => (
                <TableRow key={line.teacherId}>
                  <TableCell>{line.teacherName}</TableCell>
                  <TableCell align="right">{line.classes}</TableCell>
                  <TableCell align="right">{money(line.amountCents)}</TableCell>
                  {stripe.enabled ? (
                    <TableCell align="right">
                      {line.stripeTransfer?.status === "paid" ? (
                        <Chip size="small" color="success" label="Sent" />
                      ) : line.stripeTransfer?.status === "failed" ? (
                        <Chip size="small" color="error" label="Failed" title={line.stripeTransfer.error ?? ""} />
                      ) : (
                        <Chip
                          size="small"
                          variant="outlined"
                          color={line.stripeReady ? "success" : "warning"}
                          label={line.stripeReady ? "Ready" : "No Stripe"}
                        />
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {mode === "admin" && batch.status === "awaiting_approval" ? (
            <TextField
              size="small"
              fullWidth
              label="Reason (required to reject)"
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
            />
          ) : null}

          {mode === "admin" && batch.status === "approved" && (stripe.manualTransferEnabled ?? true) ? (
            <TextField
              size="small"
              fullWidth
              label="Transfer reference (e.g. Wise, bank wire)"
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
            />
          ) : null}

          {mode === "admin" ? (
            <Typography variant="body2" color="text.secondary">
              {stripe.enabled && (stripe.manualTransferEnabled ?? true)
                ? `Approve does not move money. Use Pay with Stripe or Mark as paid for international transfers. Settlement may take ${processingWindow}.`
                : stripe.enabled
                  ? `Approve does not move money. Use Pay with Stripe. Settlement may take ${processingWindow}.`
                  : (stripe.manualTransferEnabled ?? true)
                    ? `Record international or bank transfers with Mark as paid. Teachers are emailed on approval and payment.`
                    : `No payout rails enabled — turn on Stripe Connect or transfers under Finance → Providers.`}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={pending}>
          Close
        </Button>
        {mode === "admin" && batch.status === "awaiting_approval" ? (
          <>
            <Button color="error" disabled={pending} onClick={onReject}>
              Reject
            </Button>
            <Button variant="contained" disabled={pending} onClick={onApprove}>
              Approve
            </Button>
          </>
        ) : null}
        {mode === "admin" && batch.status === "approved" && stripe.enabled ? (
          <Button variant="contained" disabled={pending} onClick={onPayStripe}>
            Pay {money(batch.totalCents)} with Stripe
          </Button>
        ) : null}
        {mode === "admin" && batch.status === "approved" && (stripe.manualTransferEnabled ?? true) ? (
          <Button variant="contained" color="success" disabled={pending} onClick={onMarkPaid}>
            Mark as paid
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}