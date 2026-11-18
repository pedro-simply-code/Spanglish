"use client";

import { useMemo } from "react";
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
import { useLocale, useTranslations } from "next-intl";
import type { PayoutBatchItem } from "@/features/payouts/components/payouts-board";
import { PayoutBatchCycleStepper } from "@/features/payouts/components/payout-batch-cycle-stepper";

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
  const t = useTranslations("educator");
  const locale = useLocale();
  const money = useMemo(
    () => (cents: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(cents / 100),
    [locale],
  );
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
    [locale],
  );

  const statusChip = useMemo(() => ({
    awaiting_approval: { label: t("status.awaitingApproval"), color: "warning" as const },
    approved: { label: t("status.approvedToPay"), color: "info" as const },
    paid: { label: t("status.paid"), color: "success" as const },
    rejected: { label: t("status.rejected"), color: "default" as const },
  }), [t]);

  if (!batch) return null;
  const chip = statusChip[batch.status];
  const periodLabel = `${dateFormat.format(new Date(batch.periodStart))} – ${dateFormat.format(
    new Date(new Date(batch.periodEnd).getTime() - 1),
  )}`;
  const title =
    batch.initiatedBy === "teacher"
      ? t("payouts.detail.requestTitle", { teacher: batch.lines[0]?.teacherName ?? t("common.teacher") })
      : t("payouts.detail.monthlyTitle", { period: periodLabel });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h5" component="span">
            {title}
          </Typography>
          {batch.initiatedBy === "teacher" ? (
            <Chip size="small" variant="outlined" color="secondary" label={t("payouts.board.teacherRequest")} />
          ) : (
            <Chip size="small" variant="outlined" label={t("payouts.detail.managerBatch")} />
          )}
          <Chip size="small" color={chip.color} label={chip.label} />
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Stack spacing={1}>
            <MetaRow label={t("payouts.detail.total")} value={money(batch.totalCents)} />
            <MetaRow label={t("payouts.detail.classes")} value={String(batch.classCount)} />
            <MetaRow
              label={batch.initiatedBy === "teacher" ? t("payouts.detail.requestedBy") : t("payouts.detail.preparedBy")}
              value={batch.createdByName ?? "—"}
            />
            {batch.initiatedBy === "manager" ? (
              <MetaRow label={t("payouts.detail.period")} value={periodLabel} />
            ) : null}
            {batch.approvedByName ? <MetaRow label={t("payouts.detail.reviewedBy")} value={batch.approvedByName} /> : null}
            {batch.paidReference ? <MetaRow label={t("payouts.detail.paymentReference")} value={batch.paidReference} /> : null}
            {batch.rejectedReason ? (
              <Typography variant="body2" color="error.main">
                {t("payouts.detail.rejectedReason", { reason: batch.rejectedReason })}
              </Typography>
            ) : null}
          </Stack>

          <PayoutBatchCycleStepper batch={batch} />

          <Divider />

          <Typography variant="subtitle2">{t("payouts.detail.teachersInBatch")}</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("payouts.detail.teacher")}</TableCell>
                <TableCell align="right">{t("payouts.detail.classes")}</TableCell>
                <TableCell align="right">{t("payouts.detail.amount")}</TableCell>
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
                        <Chip size="small" color="success" label={t("payouts.detail.sent")} />
                      ) : line.stripeTransfer?.status === "failed" ? (
                        <Chip size="small" color="error" label={t("status.failed")} title={line.stripeTransfer.error ?? ""} />
                      ) : (
                        <Chip
                          size="small"
                          variant="outlined"
                          color={line.stripeReady ? "success" : "warning"}
                          label={line.stripeReady ? t("status.ready") : t("status.noStripe")}
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
              label={t("payouts.detail.rejectReasonLabel")}
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
            />
          ) : null}

          {mode === "admin" && batch.status === "approved" && (stripe.manualTransferEnabled ?? true) ? (
            <TextField
              size="small"
              fullWidth
              label={t("payouts.detail.transferReferenceLabel")}
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
            />
          ) : null}

          {mode === "admin" ? (
            <Typography variant="body2" color="text.secondary">
              {stripe.enabled && (stripe.manualTransferEnabled ?? true)
                ? t("payouts.detail.noteStripeManual", { window: processingWindow })
                : stripe.enabled
                  ? t("payouts.detail.noteStripeOnly", { window: processingWindow })
                  : stripe.manualTransferEnabled ?? true
                    ? t("payouts.detail.noteManualOnly")
                    : t("payouts.detail.noteNoRails")}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={pending}>
          {t("common.close")}
        </Button>
        {mode === "admin" && batch.status === "awaiting_approval" ? (
          <>
            <Button color="error" disabled={pending} onClick={onReject}>
              {t("common.reject")}
            </Button>
            <Button variant="contained" disabled={pending} onClick={onApprove}>
              {t("common.approve")}
            </Button>
          </>
        ) : null}
        {mode === "admin" && batch.status === "approved" && stripe.enabled ? (
          <Button variant="contained" disabled={pending} onClick={onPayStripe}>
            {t("payouts.detail.payWithStripe", { amount: money(batch.totalCents) })}
          </Button>
        ) : null}
        {mode === "admin" && batch.status === "approved" && (stripe.manualTransferEnabled ?? true) ? (
          <Button variant="contained" color="success" disabled={pending} onClick={onMarkPaid}>
            {t("payouts.detail.markPaid")}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
