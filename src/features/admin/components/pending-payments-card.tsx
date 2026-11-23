"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconRefresh } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/section-card";
import { verifyAllPendingPaymentsAction, verifyPendingPaymentAction } from "@/features/admin/actions/pending-payments";
import { useAppToast } from "@/lib/use-app-toast";

export type AdminPendingPayment = {
  kind: "classes" | "ai";
  id: string;
  buyerName: string;
  buyerEmail: string;
  credits: number;
  classType: string | null;
  durationMinutes: number | null;
  totalCents: number;
  currency: string;
  createdAt: string;
};

/**
 * Admin → payment providers: Stripe payments still "pending". "Check with
 * Stripe" settles them now (paid → credits, expired → canceled); the hourly
 * job does the same on its own.
 */
export function PendingPaymentsCard({ payments, stripeOn }: { payments: AdminPendingPayment[]; stripeOn: boolean }) {
  const t = useTranslations("admin.pendingPayments");
  const format = useFormatter();
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) showSuccess({ message: result.message });
      else showError({ message: result.message });
      router.refresh();
    });

  return (
    <SectionCard
      title={t("title")}
      subtitle={t("subtitle")}
      action={
        payments.length && stripeOn ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconRefresh size={16} />}
            disabled={pending}
            onClick={() => run(verifyAllPendingPaymentsAction)}
            sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {t("checkAll")}
          </Button>
        ) : null
      }
    >
      {!stripeOn ? (
        <Typography color="text.secondary">{t("stripeOff")}</Typography>
      ) : payments.length ? (
        <Stack spacing={1.5} divider={<Divider flexItem />}>
          {payments.map((payment) => (
            <Stack
              key={`${payment.kind}-${payment.id}`}
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              alignItems={{ md: "center" }}
            >
              <Box flexGrow={1} minWidth={0}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle2">{payment.buyerName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {payment.buyerEmail}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mt={0.5}>
                  <Chip size="small" color="warning" label={t("pending")} />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={
                      payment.kind === "ai"
                        ? t("aiItem", { count: payment.credits })
                        : t("classItem", { count: payment.credits, minutes: payment.durationMinutes ?? 0 })
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    {format.dateTime(new Date(payment.createdAt), { dateStyle: "medium", timeStyle: "short" })}
                  </Typography>
                </Stack>
              </Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {format.number(payment.totalCents / 100, { style: "currency", currency: payment.currency })}
              </Typography>
              <Button
                size="small"
                variant="contained"
                disabled={pending}
                onClick={() => run(() => verifyPendingPaymentAction(payment.kind, payment.id))}
                sx={{ whiteSpace: "nowrap" }}
              >
                {t("check")}
              </Button>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography color="text.secondary">{t("empty")}</Typography>
      )}
    </SectionCard>
  );
}
