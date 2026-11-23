"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getActorWithPermission } from "@/server/auth/session";
import {
  findPendingOrder,
  reconcilePendingPayments,
  reconcileStripeOrder,
  type PaymentKind,
} from "@/server/payments/reconcile";

type ActionResult = { ok: boolean; message: string };

/** Asks Stripe about one pending payment and settles it (admins). */
export async function verifyPendingPaymentAction(kind: PaymentKind, orderId: string): Promise<ActionResult> {
  const t = await getTranslations("admin.pendingPayments");
  if (!(await getActorWithPermission("platform:manage"))) return { ok: false, message: t("forbidden") };
  const order = await findPendingOrder(kind === "ai" ? "ai" : "classes", String(orderId));
  if (!order) {
    revalidatePath("/admin/finance/providers");
    return { ok: false, message: t("notPending") };
  }
  const result = await reconcileStripeOrder(kind === "ai" ? "ai" : "classes", order);
  revalidatePath("/admin/finance/providers");
  return { ok: result.outcome !== "error", message: t(`outcome.${result.outcome}`, { count: result.credits ?? 0 }) };
}

/** Same for every pending payment (including the ones still inside their 60 minutes). */
export async function verifyAllPendingPaymentsAction(): Promise<ActionResult> {
  const t = await getTranslations("admin.pendingPayments");
  if (!(await getActorWithPermission("platform:manage"))) return { ok: false, message: t("forbidden") };
  const summary = await reconcilePendingPayments({ limit: 100 });
  revalidatePath("/admin/finance/providers");
  return {
    ok: summary.error === 0,
    message: t("summary", {
      checked: summary.checked,
      paid: summary.paid,
      canceled: summary.canceled,
      open: summary.open + summary.processing,
    }),
  };
}
