import { getTranslations } from "next-intl/server";
import { PayoutsBoard } from "@/features/payouts";
import { appNowDate } from "@/lib/app-clock";
import { stripeLinesForBatch } from "@/server/payments/connect";
import { payoutMonthBounds } from "@/server/teaching/payout-month-bounds";
import { getPayoutRailsUi } from "@/server/payments/provider-settings";
import { listPayoutBatches } from "@/server/teaching/earnings";
import { payoutProcessingWindowPhrase } from "@/server/teaching/payout-policy";
import { requestTime } from "@/server/request-time";

/** Shared by /manager/payouts (prepare) and /admin/finance/payouts (approve). */
export async function PayoutsContent({
  mode,
  root,
}: {
  mode: "manager" | "admin";
  root: { title: string; to: string };
}) {
  await requestTime();
  const t = await getTranslations("educator.payouts");
  const [listed, payoutRails] = await Promise.all([listPayoutBatches(), getPayoutRailsUi()]);
  // Stripe readiness per teacher for batches that can still be paid.
  const batches = payoutRails.enabled
    ? await Promise.all(
        listed.map(async (batch) => {
          if (batch.status !== "approved" && batch.status !== "paid") return batch;
          const stripeLines = await stripeLinesForBatch(batch.id);
          return {
            ...batch,
            lines: batch.lines.map((line) => {
              const extra = stripeLines.find((item) => item.teacherId === line.teacherId);
              return { ...line, stripeReady: extra?.ready ?? false, stripeTransfer: extra?.transfer ?? null };
            }),
          };
        }),
      )
    : listed;
  const bounds = payoutMonthBounds(listed, appNowDate());
  return (
    <PayoutsBoard
      mode={mode}
      batches={batches}
      breadcrumbRoot={root}
      defaultMonth={bounds.defaultMonth}
      minMonth={bounds.minMonth}
      maxMonth={bounds.maxMonth}
      stripe={{
        enabled: payoutRails.enabled,
        manualTransferEnabled: payoutRails.manualTransferEnabled,
        testMode: payoutRails.testMode,
      }}
      processingWindow={payoutProcessingWindowPhrase(undefined, {
        one: t("processingDayOne"),
        other: t("processingDays", { days: "{days}" }),
      })}
    />
  );
}
