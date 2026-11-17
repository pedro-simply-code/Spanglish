"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

/** Teacher initiates an individual payout once Stripe is ready and balance meets the minimum. */
export function TeacherRequestPayoutCard(props: Props) {
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();

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
      title="Request a payout"
      subtitle="You choose when to get paid — each request is reviewed individually."
      action={
        props.pendingBatch ? (
          <Chip
            size="small"
            color={props.pendingBatch.status === "approved" ? "info" : "warning"}
            label={
              props.pendingBatch.status === "approved"
                ? "Approved · waiting to be sent"
                : "Waiting for approval"
            }
          />
        ) : null
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Available to request: <strong>{money(props.unpaidCents)}</strong> ({props.unpaidClasses} class
          {props.unpaidClasses === 1 ? "" : "es"}). Minimum: {money(props.minRequestCents)}.
        </Typography>
        <Alert severity="info" icon={false}>
          After you request a payout, the academy reviews it, sends the payment
          {props.payoutViaStripe ? " (Stripe or international transfer)" : " by international transfer"},
          and your bank may take up to <strong>{props.processingWindow}</strong> to show the funds. We
          email you when it is approved and when payment is sent.
        </Alert>
        {props.pendingBatch ? (
          <Alert severity="info">
            Your request for {money(props.pendingBatch.amountCents)} was submitted on{" "}
            {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
              new Date(props.pendingBatch.createdAt),
            )}
            .
            {props.pendingBatch.status === "approved"
              ? ` Approved — payment will be sent soon. Allow up to ${props.processingWindow} after it is sent.`
              : " Waiting for approval — you will get an email at each step."}
          </Alert>
        ) : null}
        {props.payoutViaStripe && !props.manualPayoutEnabled && !props.stripeReady ? (
          <Alert severity="warning">Finish Stripe setup below before you can request a payout.</Alert>
        ) : props.payoutViaStripe && props.manualPayoutEnabled && !props.stripeReady ? (
          <Alert severity="info">
            Stripe is not set up yet — you can still request a payout; the academy may pay you by international
            transfer.
          </Alert>
        ) : !props.payoutViaStripe && !props.manualPayoutEnabled ? (
          <Alert severity="warning">Payouts are paused — contact the academy.</Alert>
        ) : props.unpaidCents < props.minRequestCents ? (
          <Alert severity="info">
            Keep teaching — you can request a payout once unpaid earnings reach {money(props.minRequestCents)}.
          </Alert>
        ) : null}
        <Button variant="contained" disabled={pending || !canRequest} onClick={run}>
          Request payout · {money(props.unpaidCents)}
        </Button>
      </Stack>
    </SectionCard>
  );
}