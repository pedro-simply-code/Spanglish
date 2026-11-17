"use client";

import { useTransition } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { SectionCard } from "@/components/ui/section-card";
import { openStripeDashboardAction, startStripeOnboardingAction } from "@/features/payouts/actions";
import { useAppToast } from "@/lib/use-app-toast";

/** Teacher: connect (or open) the Stripe account that receives payouts. */
export function StripeConnectCard({
  connected,
  ready,
  testMode,
}: {
  connected: boolean;
  ready: boolean;
  testMode: boolean;
}) {
  const { showError } = useAppToast();
  const [pending, startTransition] = useTransition();

  const go = (action: () => Promise<{ ok: boolean; message: string; url?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok && result.url) window.location.assign(result.url);
      else showError({ message: result.message });
    });

  return (
    <SectionCard
      title="Get paid with Stripe"
      subtitle="Payouts arrive in your Stripe account, then in your bank."
      action={
        <Chip
          size="small"
          color={ready ? "success" : connected ? "warning" : "default"}
          label={ready ? "Ready for payouts" : connected ? "Setup not finished" : "Not connected"}
        />
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Stripe asks for your identity and bank details; the academy never sees them. You only do
          this once.
        </Typography>
        {testMode ? (
          <Alert severity="warning">
            Test mode: use Stripe&apos;s test data (for example the test bank account and the
            &quot;000-000&quot; verification code). No real money moves.
          </Alert>
        ) : null}
        <Stack direction="row" spacing={1.5}>
          {ready ? (
            <Button variant="outlined" disabled={pending} onClick={() => go(openStripeDashboardAction)}>
              Open my Stripe dashboard
            </Button>
          ) : (
            <Button variant="contained" disabled={pending} onClick={() => go(startStripeOnboardingAction)}>
              {connected ? "Finish Stripe setup" : "Connect Stripe"}
            </Button>
          )}
        </Stack>
      </Stack>
    </SectionCard>
  );
}
