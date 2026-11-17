"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { IconEye } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { DEFAULT_PAGE_SIZE, sliceForPage } from "@/lib/pagination";
import {
  approvePayoutBatchAction,
  markPayoutBatchPaidAction,
  payBatchWithStripeAction,
  rejectPayoutBatchAction,
} from "@/features/payouts/actions";
import { PayoutBatchDetailDialog } from "@/features/payouts/components/payout-batch-detail-dialog";
import { PayoutMonthNav } from "@/features/payouts/components/payout-month-nav";
import { clampMonth, utcMonthKey as monthKeyFromDate } from "@/lib/payout-month";
import { useAppToast } from "@/lib/use-app-toast";

export type PayoutLine = {
  teacherId: string;
  teacherName: string;
  classes: number;
  amountCents: number;
  stripeReady?: boolean;
  stripeTransfer?: { status: "paid" | "failed"; error: string | null } | null;
};

export type PayoutBatchItem = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: "awaiting_approval" | "approved" | "paid" | "rejected";
  initiatedBy: "manager" | "teacher";
  totalCents: number;
  teacherCount: number;
  classCount: number;
  createdByName: string | null;
  approvedByName: string | null;
  paidReference: string | null;
  rejectedReason: string | null;
  createdAt?: string;
  approvedAt?: string | null;
  paidAt?: string | null;
  lines: PayoutLine[];
};

type Props = {
  mode: "manager" | "admin";
  batches: PayoutBatchItem[];
  breadcrumbRoot: { title: string; to: string };
  defaultMonth: string;
  minMonth: string;
  /** Do not browse past this month (`YYYY-MM`, UTC). */
  maxMonth: string;
  stripe?: { enabled: boolean; testMode: boolean; manualTransferEnabled?: boolean };
  processingWindow?: string;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const period = (batch: PayoutBatchItem) =>
  `${dateFormat.format(new Date(batch.periodStart))} – ${dateFormat.format(new Date(new Date(batch.periodEnd).getTime() - 1))}`;

const requestLabel = (batch: PayoutBatchItem) => {
  if (batch.initiatedBy === "teacher") {
    return batch.lines[0]?.teacherName ?? "Teacher request";
  }
  return period(batch);
};

const statusChip = {
  awaiting_approval: { label: "Awaiting approval", color: "warning" as const },
  approved: { label: "Approved", color: "info" as const },
  paid: { label: "Paid", color: "success" as const },
  rejected: { label: "Rejected", color: "default" as const },
};

function isoMonthKey(iso: string) {
  return monthKeyFromDate(new Date(iso));
}

function batchPeriodMonth(batch: PayoutBatchItem) {
  return isoMonthKey(batch.periodStart);
}

function batchCreatedMonth(batch: PayoutBatchItem) {
  return batch.createdAt ? isoMonthKey(batch.createdAt) : null;
}

function batchPaidMonth(batch: PayoutBatchItem) {
  return batch.paidAt ? isoMonthKey(batch.paidAt) : null;
}

function isOpenBatch(batch: PayoutBatchItem) {
  return batch.status === "awaiting_approval" || batch.status === "approved";
}

/** Only rows tied to this calendar month (submitted or paid), never “sticky” open requests. */
function batchVisibleInMonth(batch: PayoutBatchItem, month: string) {
  const created = batchCreatedMonth(batch);
  const paid = batchPaidMonth(batch);
  if (batch.initiatedBy === "teacher") {
    if (created === month) return true;
    if (batch.status === "paid" && paid === month) return true;
    return false;
  }
  if (batchPeriodMonth(batch) === month) return true;
  if (batch.status === "paid" && paid === month && paid !== batchPeriodMonth(batch)) return true;
  return false;
}

function monthPayoutStats(batches: PayoutBatchItem[], month: string) {
  let paidCents = 0;
  let inProgressCents = 0;
  for (const batch of batches) {
    if (batch.initiatedBy === "manager") {
      if (batchPeriodMonth(batch) !== month) continue;
      if (batch.status === "paid") paidCents += batch.totalCents;
      else if (isOpenBatch(batch)) inProgressCents += batch.totalCents;
      continue;
    }
    const created = batchCreatedMonth(batch);
    const paid = batchPaidMonth(batch);
    if (batch.status === "paid" && paid === month) paidCents += batch.totalCents;
    else if (isOpenBatch(batch) && created === month) inProgressCents += batch.totalCents;
  }
  return { paidCents, inProgressCents };
}

export function PayoutsBoard({
  mode,
  batches,
  breadcrumbRoot,
  defaultMonth,
  minMonth,
  maxMonth,
  stripe = { enabled: false, testMode: false, manualTransferEnabled: true },
  processingWindow = "a few business days",
}: Props) {
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [month, setMonth] = useState(() => clampMonth(defaultMonth, minMonth, maxMonth));
  const [listPage, setListPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const detailBatch = useMemo(
    () => (detailId ? (batches.find((batch) => batch.id === detailId) ?? null) : null),
    [batches, detailId],
  );

  const { paidCents, inProgressCents } = useMemo(() => monthPayoutStats(batches, month), [batches, month]);

  const filteredBatches = useMemo(
    () =>
      [...batches]
        .filter((batch) => batchVisibleInMonth(batch, month))
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        }),
    [batches, month],
  );

  const pagedBatches = useMemo(
    () => sliceForPage(filteredBatches, listPage, DEFAULT_PAGE_SIZE),
    [filteredBatches, listPage],
  );

  useEffect(() => {
    setListPage(1);
  }, [month]);

  const run = (task: () => Promise<{ ok: boolean; message: string }>, afterOk?: () => void) =>
    startTransition(async () => {
      const result = await task();
      if (result.ok) {
        showSuccess({ message: result.message });
        afterOk?.();
        router.refresh();
      } else showError({ message: result.message });
    });

  const detailNote = detailId ? (inputs[detailId] ?? "") : "";
  const setDetailNote = (value: string) => {
    if (!detailId) return;
    setInputs({ ...inputs, [detailId]: value });
  };

  return (
    <Box mt={3}>
      <Breadcrumb
        title={mode === "admin" ? "Payout approvals" : "Teacher payouts"}
        subtitle="Browse by month, then open a row for the payout cycle, line items, and actions."
        items={[breadcrumbRoot, { title: "Payouts" }]}
      />

      <Stack spacing={3}>
        <PayoutMonthNav
          month={month}
          minMonth={minMonth}
          maxMonth={maxMonth}
          onMonthChange={(next) => setMonth(clampMonth(next, minMonth, maxMonth))}
          paidCents={paidCents}
          pendingCents={inProgressCents}
        />

        <SectionCard title={mode === "admin" ? "Approval queue" : "Payout batches"} subtitle="Rows for the month selected above.">
          {filteredBatches.length ? (
            <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Request</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Classes</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell align="right"> </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedBatches.map((batch) => {
                  const chip = statusChip[batch.status];
                  return (
                    <TableRow key={batch.id} hover sx={{ cursor: "pointer" }} onClick={() => setDetailId(batch.id)}>
                      <TableCell>
                        <Typography variant="subtitle2">{requestLabel(batch)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {batch.initiatedBy === "teacher"
                            ? batch.createdByName ?? "Teacher"
                            : `${batch.teacherCount} teachers · ${batch.createdByName ?? "Manager"}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {batch.initiatedBy === "teacher" ? (
                          <Chip size="small" variant="outlined" color="secondary" label="Teacher request" />
                        ) : (
                          <Chip size="small" variant="outlined" label="Monthly batch" />
                        )}
                      </TableCell>
                      <TableCell align="right">{money(batch.totalCents)}</TableCell>
                      <TableCell align="right">{batch.classCount}</TableCell>
                      <TableCell>
                        <Chip size="small" color={chip.color} label={chip.label} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {batch.createdAt ? dateTimeFormat.format(new Date(batch.createdAt)) : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                        <IconButton aria-label="View payout details" size="small" onClick={() => setDetailId(batch.id)}>
                          <IconEye size={18} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <ListPagination page={listPage} total={filteredBatches.length} onPageChange={setListPage} />
            </>
          ) : (
            <Typography color="text.secondary">
              No payout requests in this month. Use the arrows to browse other months — open requests only appear in the month they
              were submitted (or the month they were paid).
            </Typography>
          )}
          {mode === "admin" ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              {stripe.enabled
                ? `Open a row for the cycle stepper, teacher lines, and pay actions. Settlement may take up to ${processingWindow}.`
                : `Open a row to approve, reject, or mark as paid after an off-platform transfer.`}
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              Teachers start payouts from Earnings when they are ready. Approve or reject each request in the table.
            </Alert>
          )}
        </SectionCard>
      </Stack>

      <PayoutBatchDetailDialog
        open={Boolean(detailBatch)}
        batch={detailBatch}
        mode={mode}
        pending={pending}
        stripe={stripe}
        processingWindow={processingWindow}
        note={detailNote}
        onNoteChange={setDetailNote}
        onClose={() => setDetailId(null)}
        onApprove={() =>
          detailBatch && run(() => approvePayoutBatchAction(detailBatch.id), () => setDetailId(null))
        }
        onReject={() =>
          detailBatch && run(() => rejectPayoutBatchAction(detailBatch.id, detailNote), () => setDetailId(null))
        }
        onPayStripe={() => detailBatch && run(() => payBatchWithStripeAction(detailBatch.id))}
        onMarkPaid={() =>
          detailBatch && run(() => markPayoutBatchPaidAction(detailBatch.id, detailNote), () => setDetailId(null))
        }
      />
    </Box>
  );
}