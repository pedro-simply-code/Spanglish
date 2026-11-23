"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { getActorWithPermission } from "@/server/auth/session";
import { deleteAiCreditPack, saveAiCreditPack, type AiPackInput } from "@/server/ai/credits";

type ActionResult = { ok: boolean; message: string };

function revalidate() {
  for (const path of ["/admin/commerce/packages", "/credits", "/pricing"]) revalidatePath(path);
}

/** Creates or updates an AI credit pack (admins only). */
export async function saveAiCreditPackAction(input: AiPackInput): Promise<ActionResult> {
  const t = await getTranslations("admin.aiPacks");
  const actor = await getActorWithPermission("platform:manage");
  if (!actor) return { ok: false, message: t("forbidden") };
  const result = await saveAiCreditPack({
    id: input.id ? String(input.id) : undefined,
    name: String(input.name ?? ""),
    priceUsd: Number(input.priceUsd),
    marginPercent: Number(input.marginPercent),
    active: Boolean(input.active),
  });
  if (!result.ok) return { ok: false, message: t("invalid") };
  await recordAuditEvent({
    action: "ai_pack.saved",
    actorUserId: actor.userId,
    targetType: "ai_credit_pack",
    targetId: input.id ?? "new",
    metadata: { priceUsd: input.priceUsd, marginPercent: input.marginPercent, active: input.active },
  });
  revalidate();
  return { ok: true, message: t("saved") };
}

export async function deleteAiCreditPackAction(id: string): Promise<ActionResult> {
  const t = await getTranslations("admin.aiPacks");
  const actor = await getActorWithPermission("platform:manage");
  if (!actor) return { ok: false, message: t("forbidden") };
  await deleteAiCreditPack(String(id));
  revalidate();
  return { ok: true, message: t("deleted") };
}
