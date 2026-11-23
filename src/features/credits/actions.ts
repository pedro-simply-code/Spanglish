"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getActorWithPermission } from "@/server/auth/session";
import { findPendingOrder, reconcileStripeOrder, type PaymentKind } from "@/server/payments/reconcile";

export type ResumePaymentResult = { ok: boolean; message: string; redirectUrl?: string | null };

/**
 * "Finish payment" on a pending purchase: asks Stripe about it. Still open →
 * back to the Stripe page; already paid → credits added now; expired → canceled.
 */
export async function resumePaymentAction(kind: PaymentKind, orderId: string): Promise<ResumePaymentResult> {
  const t = await getTranslations("student.learn.credits.pending");
  const actor = await getActorWithPermission("classes:book");
  if (!actor) return { ok: false, message: t("notFound") };
  const order = await findPendingOrder(kind === "ai" ? "ai" : "classes", String(orderId), actor.userId);
  if (!order) {
    revalidatePath("/credits");
    return { ok: false, message: t("notFound") };
  }

  const result = await reconcileStripeOrder(kind === "ai" ? "ai" : "classes", order);
  revalidatePath("/credits");
  switch (result.outcome) {
    case "open":
      return { ok: true, message: t("opening"), redirectUrl: result.url };
    case "paid":
      return { ok: true, message: t("paid", { count: result.credits ?? 0 }) };
    case "canceled":
      return { ok: false, message: t("expired") };
    case "processing":
      return { ok: true, message: t("processing") };
    default:
      return { ok: false, message: t("failed") };
  }
}
