"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";
import type { PayoutBatchItem } from "@/features/payouts/components/payouts-board";

/** Payout progress: request → approval → payment (on-demand, not month close). */
export function PayoutBatchCycleStepper({ batch }: { batch: PayoutBatchItem }) {
  const t = useTranslations("educator.payouts.stepper");
  const locale = useLocale();
  const dayFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" });

  const steps = [t("request"), t("approved"), t("sent")];

  const active =
    batch.status === "paid"
      ? 3
      : batch.status === "approved"
        ? 2
        : batch.status === "awaiting_approval"
          ? 1
          : batch.status === "rejected"
            ? 1
            : 0;

  const formatWhen = (iso: string | undefined | null) => (iso ? dayFormat.format(new Date(iso)) : "");
  const dates = [formatWhen(batch.createdAt), formatWhen(batch.approvedAt), formatWhen(batch.paidAt)];

  const waiting =
    batch.status === "rejected"
      ? { label: t("rejected"), color: "default" as const }
      : batch.status === "awaiting_approval"
        ? { label: t("awaitingApproval"), color: "warning" as const }
        : batch.status === "approved"
          ? { label: t("readyToSend"), color: "info" as const }
          : { label: t("complete"), color: "success" as const };

  const title =
    batch.initiatedBy === "teacher"
      ? batch.lines[0]?.teacherName ?? t("teacherPayout")
      : batch.createdByName
        ? t("requestFrom", { name: batch.createdByName })
        : t("payoutRequest");

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="subtitle2" fontWeight={600}>
          {title}
        </Typography>
        <Chip size="small" color={waiting.color} label={waiting.label} />
      </Stack>
      <Stepper activeStep={active} alternativeLabel>
        {steps.map((label, index) => (
          <Step key={label} completed={index < active}>
            <StepLabel optional={<Typography variant="caption">{dates[index] || " "}</Typography>}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}
