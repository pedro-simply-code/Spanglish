import type { PayoutBatchView } from "@/server/teaching/earnings";
import { earliestMonthKey, utcMonthKey } from "@/lib/payout-month";

function monthsForBatch(batch: PayoutBatchView): string[] {
  const keys: string[] = [utcMonthKey(new Date(batch.periodStart))];
  if (batch.createdAt) keys.push(utcMonthKey(new Date(batch.createdAt)));
  if (batch.paidAt) keys.push(utcMonthKey(new Date(batch.paidAt)));
  return keys;
}

/** Earliest month with payout data, for month-nav lower bound. */
export function payoutMonthBounds(batches: PayoutBatchView[], now: Date) {
  const maxMonth = utcMonthKey(now);
  const minMonth = earliestMonthKey(batches.flatMap(monthsForBatch), maxMonth);
  return { minMonth, maxMonth, defaultMonth: maxMonth };
}