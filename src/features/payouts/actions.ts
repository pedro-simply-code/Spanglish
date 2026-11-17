"use server";

import { revalidatePath } from "next/cache";
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
  const actor = await getActorWithPermission("classes:manage");
  if (!actor || !actor.roles.includes("teacher")) {
    return { ok: false, message: "Only teachers can request payouts." };
  }
  const result = await requestTeacherPayout(actor);
  if (result.ok) refresh();
  return result;
}

export async function createPayoutBatchAction(input: { periodStart: string; periodEnd: string }): Promise<PayoutActionResult> {
  const actor = await getActorWithPermission("payouts:prepare");
  if (!actor) return { ok: false, message: "Only managers and the admin prepare payouts." };
  const result = await createPayoutBatch(actor, input);
  if (result.ok) refresh();
  return result;
}

export async function approvePayoutBatchAction(id: string): Promise<PayoutActionResult> {
  const actor = await getActorWithPermission("payouts:approve");
  if (!actor) return { ok: false, message: "Only the admin approves payouts." };
  const result = await approvePayoutBatch(actor, id);
  if (result.ok) refresh();
  return result;
}

export async function rejectPayoutBatchAction(id: string, reason: string): Promise<PayoutActionResult> {
  const actor = await getActorWithPermission("payouts:approve");
  if (!actor) return { ok: false, message: "Only the admin rejects payouts." };
  const result = await rejectPayoutBatch(actor, id, reason);
  if (result.ok) refresh();
  return result;
}

export async function markPayoutBatchPaidAction(id: string, reference: string): Promise<PayoutActionResult> {
  const actor = await getActorWithPermission("payouts:approve");
  if (!actor) return { ok: false, message: "Only the admin marks payouts as paid." };
  const settings = await getPaymentProviderSettings();
  if (!manualPayoutAllowed(settings)) {
    return { ok: false, message: "Manual transfers are turned off in payment provider settings." };
  }
  const result = await markPayoutBatchPaid(actor, id, reference);
  if (result.ok) refresh();
  return result;
}

export async function savePayoutSettingsAction(input: PayoutSettings): Promise<PayoutActionResult> {
  const actor = await getActorWithPermission("payouts:approve");
  if (!actor) return { ok: false, message: "Only the admin changes teacher rates." };
  const result = await savePayoutSettings(actor, input);
  if (result.ok) {
    revalidatePath("/admin/finance/teacher-rates");
    refresh();
  }
  return result;
}

/** Teacher: opens Stripe onboarding (creates the Connect account the first time). */
export async function startStripeOnboardingAction(): Promise<{ ok: boolean; message: string; url?: string }> {
  const actor = await getActorWithPermission("classes:manage");
  if (!actor || !actor.roles.includes("teacher")) return { ok: false, message: "Only teachers connect Stripe." };
  const settings = await getPaymentProviderSettings();
  if (!payoutUsesStripeConnect(settings)) {
    return { ok: false, message: "Stripe Connect payouts are turned off." };
  }
  if (!stripeEnabled) return { ok: false, message: "Stripe is not configured yet." };
  try {
    return { ok: true, message: "Opening Stripe…", url: await createOnboardingLink(actor) };
  } catch (error) {
    return { ok: false, message: stripeErrorMessage(error) };
  }
}

/** Teacher: Stripe Express dashboard (bank account, payout history). */
export async function openStripeDashboardAction(): Promise<{ ok: boolean; message: string; url?: string }> {
  const actor = await getActorWithPermission("classes:manage");
  const settings = await getPaymentProviderSettings();
  if (!payoutUsesStripeConnect(settings)) return { ok: false, message: "Stripe Connect payouts are turned off." };
  if (!actor || !stripeEnabled) return { ok: false, message: "Stripe is not available." };
  try {
    const url = await createDashboardLink(actor);
    return url ? { ok: true, message: "Opening Stripe…", url } : { ok: false, message: "Finish connecting Stripe first." };
  } catch (error) {
    return { ok: false, message: stripeErrorMessage(error) };
  }
}

/** Admin: pays an approved batch with Stripe transfers. */
export async function payBatchWithStripeAction(batchId: string): Promise<PayoutActionResult> {
  const actor = await getActorWithPermission("payouts:approve");
  if (!actor) return { ok: false, message: "Only the admin sends payouts." };
  const settings = await getPaymentProviderSettings();
  if (!payoutUsesStripeConnect(settings)) return { ok: false, message: "Stripe Connect payouts are turned off." };
  if (!stripeEnabled) return { ok: false, message: "Stripe is not configured." };
  const result = await payBatchWithStripe(actor, batchId);
  refresh();
  return result;
}
