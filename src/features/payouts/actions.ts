"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getActorWithPermission } from "@/server/auth/session";
import { createDashboardLink, createOnboardingLink, payBatchWithStripe } from "@/server/payments/connect";
import {
  getPaymentProviderSettings,
  payoutUsesStripeConnect,
  manualPayoutAllowed,
} from "@/server/payments/provider-settings";
import { stripeEnabled, stripeErrorMessage } from "@/server/payments/stripe";
import {
  approvePayoutBatch,
  createPayoutBatch,
  markPayoutBatchPaid,
  rejectPayoutBatch,
  requestTeacherPayout,
  savePayoutSettings,
  unpaidEarningsByTeacher,
  type PayoutSettings,
} from "@/server/teaching/earnings";

export type PayoutActionResult = { ok: boolean; message: string };

function refresh() {
  revalidatePath("/manager/payouts");
  revalidatePath("/admin/finance/payouts");
  revalidatePath("/admin/finance/ledger");
  revalidatePath("/teacher/earnings");
}

/** Unpaid totals per teacher up to the end of a period (manager preview). */
export async function previewPayoutAction(periodEnd: string) {
  const actor = await getActorWithPermission("payouts:prepare");
  const end = new Date(periodEnd);
  if (!actor || Number.isNaN(end.getTime())) return [];
  return unpaidEarningsByTeacher(end);
}

/** Teacher: individual payout request (min $50, Stripe ready). */
export async function requestTeacherPayoutAction(): Promise<PayoutActionResult> {
  const t = await getTranslations("educator.payouts");
  const actor = await getActorWithPermission("classes:manage");
  if (!actor || !actor.roles.includes("teacher")) {
    return { ok: false, message: t("actions.onlyTeachersRequest") };
  }
  const result = await requestTeacherPayout(actor);
  if (result.ok) refresh();
  return result;
}

export async function createPayoutBatchAction(input: { periodStart: string; periodEnd: string }): Promise<PayoutActionResult> {
  const t = await getTranslations("educator.payouts");
  const actor = await getActorWithPermission("payouts:prepare");
  if (!actor) return { ok: false, message: t("actions.onlyManagersPrepare") };
  const result = await createPayoutBatch(actor, input);
  if (result.ok) refresh();
  return result;
}

export async function approvePayoutBatchAction(id: string): Promise<PayoutActionResult> {
  const t = await getTranslations("educator.payouts");
  const actor = await getActorWithPermission("payouts:approve");
  if (!actor) return { ok: false, message: t("actions.onlyAdminApproves") };
  const result = await approvePayoutBatch(actor, id);
  if (result.ok) refresh();
  return result;
}

export async function rejectPayoutBatchAction(id: string, reason: string): Promise<PayoutActionResult> {
  const t = await getTranslations("educator.payouts");
  const actor = await getActorWithPermission("payouts:approve");
  if (!actor) return { ok: false, message: t("actions.onlyAdminRejects") };
  const result = await rejectPayoutBatch(actor, id, reason);
  if (result.ok) refresh();
  return result;
}

export async function markPayoutBatchPaidAction(id: string, reference: string): Promise<PayoutActionResult> {
  const t = await getTranslations("educator.payouts");
  const actor = await getActorWithPermission("payouts:approve");
  if (!actor) return { ok: false, message: t("actions.onlyAdminMarksPaid") };
  const settings = await getPaymentProviderSettings();
  if (!manualPayoutAllowed(settings)) {
    return { ok: false, message: t("actions.manualTransfersOff") };
  }
  const result = await markPayoutBatchPaid(actor, id, reference);
  if (result.ok) refresh();
  return result;
}

export async function savePayoutSettingsAction(input: PayoutSettings): Promise<PayoutActionResult> {
  const t = await getTranslations("educator.payouts");
  const actor = await getActorWithPermission("payouts:approve");
  if (!actor) return { ok: false, message: t("actions.onlyAdminChangesRates") };
  const result = await savePayoutSettings(actor, input);
  if (result.ok) {
    revalidatePath("/admin/finance/teacher-rates");
    refresh();
  }
  return result;
}

/** Teacher: opens Stripe onboarding (creates the Connect account the first time). */
export async function startStripeOnboardingAction(): Promise<{ ok: boolean; message: string; url?: string }> {
  const t = await getTranslations("educator.payouts");
  const actor = await getActorWithPermission("classes:manage");
  if (!actor || !actor.roles.includes("teacher")) return { ok: false, message: t("actions.onlyTeachersConnectStripe") };
  const settings = await getPaymentProviderSettings();
  if (!payoutUsesStripeConnect(settings)) {
    return { ok: false, message: t("actions.stripeConnectOff") };
  }
  if (!stripeEnabled) return { ok: false, message: t("actions.stripeNotConfigured") };
  try {
    return { ok: true, message: t("actions.openingStripe"), url: await createOnboardingLink(actor) };
  } catch (error) {
    return { ok: false, message: stripeErrorMessage(error, t("unknownStripeError")) };
  }
}

/** Teacher: Stripe Express dashboard (bank account, payout history). */
export async function openStripeDashboardAction(): Promise<{ ok: boolean; message: string; url?: string }> {
  const t = await getTranslations("educator.payouts");
  const actor = await getActorWithPermission("classes:manage");
  const settings = await getPaymentProviderSettings();
  if (!payoutUsesStripeConnect(settings)) return { ok: false, message: t("actions.stripeConnectOff") };
  if (!actor || !stripeEnabled) return { ok: false, message: t("actions.stripeUnavailable") };
  try {
    const url = await createDashboardLink(actor);
    return url
      ? { ok: true, message: t("actions.openingStripe"), url }
      : { ok: false, message: t("actions.finishConnectingStripe") };
  } catch (error) {
    return { ok: false, message: stripeErrorMessage(error, t("unknownStripeError")) };
  }
}

/** Admin: pays an approved batch with Stripe transfers. */
export async function payBatchWithStripeAction(batchId: string): Promise<PayoutActionResult> {
  const t = await getTranslations("educator.payouts");
  const actor = await getActorWithPermission("payouts:approve");
  if (!actor) return { ok: false, message: t("actions.onlyAdminSends") };
  const settings = await getPaymentProviderSettings();
  if (!payoutUsesStripeConnect(settings)) return { ok: false, message: t("actions.stripeConnectOff") };
  if (!stripeEnabled) return { ok: false, message: t("actions.stripeNotConfiguredShort") };
  const result = await payBatchWithStripe(actor, batchId);
  refresh();
  return result;
}
