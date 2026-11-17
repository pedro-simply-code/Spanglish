"use server";

import { revalidatePath } from "next/cache";
import { getActorWithPermission } from "@/server/auth/session";
import {
  savePaymentProviderSettings,
  type PaymentProviderSettings,
} from "@/server/payments/provider-settings";

export type PaymentProviderActionResult = { ok: boolean; message: string };

export async function savePaymentProviderSettingsAction(
  input: PaymentProviderSettings,
): Promise<PaymentProviderActionResult> {
  const actor = await getActorWithPermission("payouts:approve");
  if (!actor) return { ok: false, message: "Only the admin can change payment providers." };
  const result = await savePaymentProviderSettings(actor, input);
  if (result.ok) {
    revalidatePath("/admin/finance/providers");
    revalidatePath("/checkout");
    revalidatePath("/admin/finance/payouts");
    revalidatePath("/teacher/earnings");
  }
  return result;
}