import { env } from "@/env";

/** Business days for payout review + bank settlement messaging (not a hard SLA). */
export function payoutProcessingBusinessDays() {
  return env.PAYOUT_PROCESSING_BUSINESS_DAYS;
}

export function payoutProcessingWindowPhrase(
  days = payoutProcessingBusinessDays(),
  labels = { one: "BUSINESS_DAY_ONE", other: "BUSINESS_DAYS_{days}" },
) {
  const template = days === 1 ? labels.one : labels.other;
  return template.replace("{days}", String(days));
}