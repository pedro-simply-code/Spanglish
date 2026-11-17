/* Teacher pay from credit revenue share (pure: server + tests). */

import type { TeacherLevel } from "@/lib/teacher-levels";

export type PayoutSettings = {
  /** Platform keep rate per teacher level (1–4), e.g. 25 = academy keeps 25%, teacher gets 75%. */
  platformTakeLevel1: number;
  platformTakeLevel2: number;
  platformTakeLevel3: number;
  platformTakeLevel4: number;
  /** Trial/demo lessons: % of the normal teacher share (student often pays no credit). */
  trialPercent: number;
  /** Subsidy base when a trial has no credit value (list-price reference). */
  trialReference25Cents: number;
  trialReference50Cents: number;
};

export const defaultPayoutSettings: PayoutSettings = {
  platformTakeLevel1: 25,
  platformTakeLevel2: 20,
  platformTakeLevel3: 15,
  platformTakeLevel4: 10,
  trialPercent: 50,
  trialReference25Cents: 1_600,
  trialReference50Cents: 2_300,
};

/** Teachers may request a payout once unpaid earnings reach this amount (USD). */
export const MIN_TEACHER_PAYOUT_REQUEST_CENTS = 5_000;

export function platformTakePercentForLevel(settings: PayoutSettings, level: TeacherLevel["level"]) {
  const map: Record<number, number> = {
    1: settings.platformTakeLevel1,
    2: settings.platformTakeLevel2,
    3: settings.platformTakeLevel3,
    4: settings.platformTakeLevel4,
  };
  return map[level] ?? settings.platformTakeLevel1;
}

export function teacherSharePercent(platformTakePercent: number) {
  return Math.max(0, Math.min(100, 100 - platformTakePercent));
}

export type ClassEarningResult = {
  /** Revenue attributed to this class (credit value or trial reference). */
  baseCents: number;
  amountCents: number;
  platformCents: number;
  /** Stored on teacher_earnings.level_percent — teacher share % at delivery. */
  teacherSharePercent: number;
};

/** Pay for one delivered class: credit value × teacher share × trial % when applicable. */
export function classEarning(
  settings: PayoutSettings,
  input: {
    creditValueCents: number;
    level: TeacherLevel["level"];
    billingKind?: "standard" | "trial";
  },
): ClassEarningResult {
  const take = platformTakePercentForLevel(settings, input.level);
  const share = teacherSharePercent(take);
  let amountCents = Math.round((input.creditValueCents * share) / 100);
  if (input.billingKind === "trial") {
    amountCents = Math.round((amountCents * settings.trialPercent) / 100);
  }
  const platformCents = Math.max(0, input.creditValueCents - amountCents);
  return {
    baseCents: input.creditValueCents,
    amountCents,
    platformCents,
    teacherSharePercent: share,
  };
}

export function trialReferenceCents(settings: PayoutSettings, durationMinutes: number) {
  return durationMinutes >= 50 ? settings.trialReference50Cents : settings.trialReference25Cents;
}