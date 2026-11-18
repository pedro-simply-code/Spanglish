"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/section-card";
import { requestTeacherPayoutAction } from "@/features/payouts/actions";
import { useAppToast } from "@/lib/use-app-toast";

type Props = {
  unpaidCents: number;
  unpaidClasses: number;
  stripeReady: boolean;
  payoutViaStripe: boolean;
  manualPayoutEnabled: boolean;
  minRequestCents: number;
  pendingBatch: { id: string; status: "awaiting_approval" | "approved"; amountCents: number; createdAt: string } | null;
  /** e.g. "5 business days" */
  processingWindow: string;
};

/** Teacher initiates an individual payout once Stripe is ready and balance meets the minimum. */
export function TeacherRequestPayoutCard(props: Props) {
  const t = useTranslations("educator.payouts.requestCard");
  const locale = useLocale();
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();

  const money = useMemo(
    () => (cents: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(cents / 100),
    [locale],
  );
  const shortDate = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }),
    [locale],
  );

  const payoutReady =
    props.manualPayoutEnabled || (props.payoutViaStripe && props.stripeReady);
  const canRequest =
    payoutReady &&
    (props.payoutViaStripe || props.manualPayoutEnabled) &&
    !props.pendingBatch &&
    props.unpaidCents >= props.minRequestCents &&
    props.unpaidClasses > 0;

  const run = () =>
    startTransition(async () => {
      const result = await requestTeacherPayoutAction();
      if (result.ok) {
        showSuccess({ message: result.message });
        router.refresh();
      } else showError({ message: result.message });
    });

  return (
    <SectionCard
      title={t("title")}
      subtitle={t("subtitle")}
      action={
        props.pendingBatch ? (
          <Chip
            size="small"
            color={props.pendingBatch.status === "approved" ? "info" : "warning"}
            label={
              props.pendingBatch.status === "approved"
                ? t("approvedWaiting")
                : t("waitingApproval")
            }
          />
        ) : null
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          {t("available", {
            amount: money(props.unpaidCents),
            count: props.unpaidClasses,
            min: money(props.minRequestCents),
          })}
        </Typography>
        <Alert severity="info" icon={false}>
          {t("afterRequest", {
            method: t(props.payoutViaStripe ? "methodStripe" : "methodTransfer"),
            window: props.processingWindow,
          })}
        </Alert>
        {props.pendingBatch ? (
          <Alert severity="info">
            {t("pendingRequest", {
              amount: money(props.pendingBatch.amountCents),
              date: shortDate.format(new Date(props.pendingBatch.createdAt)),
            })}
            {props.pendingBatch.status === "approved"
              ? t("approvedSoon", { window: props.processingWindow })
              : t("waitingEmail")}
          </Alert>
        ) : null}
        {props.payoutViaStripe && !props.manualPayoutEnabled && !props.stripeReady ? (
          <Alert severity="warning">{t("finishStripe")}</Alert>
        ) : props.payoutViaStripe && props.manualPayoutEnabled && !props.stripeReady ? (
          <Alert severity="info">{t("stripeNotSet")}</Alert>
        ) : !props.payoutViaStripe && !props.manualPayoutEnabled ? (
          <Alert severity="warning">{t("payoutsPaused")}</Alert>
        ) : props.unpaidCents < props.minRequestCents ? (
          <Alert severity="info">{t("keepTeaching", { amount: money(props.minRequestCents) })}</Alert>
        ) : null}
        <Button variant="contained" disabled={pending || !canRequest} onClick={run}>
          {t("requestButton", { amount: money(props.unpaidCents) })}
        </Button>
      </Stack>
    </SectionCard>
  );
}
