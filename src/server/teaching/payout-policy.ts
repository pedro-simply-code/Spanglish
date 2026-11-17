import { env } from "@/env";

/** Business days for payout review + bank settlement messaging (not a hard SLA). */
export function payoutProcessingBusinessDays() {
  return env.PAYOUT_PROCESSING_BUSINESS_DAYS;
}

export function payoutProcessingWindowPhrase(days = payoutProcessingBusinessDays()) {
  return days === 1 ? "1 business day" : `${days} business days`;
}