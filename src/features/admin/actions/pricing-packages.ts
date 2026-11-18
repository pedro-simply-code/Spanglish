"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import {
  deletePricingPackage,
  savePricingPackage,
  seedPricingPackagesFromDefaults,
} from "@/server/pricing/packages";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { getActorWithPermission } from "@/server/auth/session";
import { academyPlans } from "@/features/academy/data";
import {
  pricingPackageInputSchema,
  type PricingPackageInput,
} from "@/lib/pricing-package-schema";
import type { AdminPackageKindFilter } from "@/lib/admin-package-filter";

type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; code: string; message: string };

const adminPaths = ["/admin/commerce/packages", "/admin/commerce/paired", "/pricing", "/checkout"];

function revalidatePricing() {
  for (const path of adminPaths) revalidatePath(path);
}

async function requireAdmin(): Promise<ActionResult | null> {
  const t = await getTranslations("admin");
  const actor = await getActorWithPermission("platform:manage");
  if (!actor) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: t("actions.pricing.forbidden"),
    };
  }
  return null;
}

export async function savePricingPackageAction(
  input: PricingPackageInput,
  previousId?: string,
): Promise<ActionResult> {
  const t = await getTranslations("admin");
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = pricingPackageInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      message: t("actions.pricing.invalidData"),
    };
  }

  const result = await savePricingPackage(parsed.data, { previousId });
  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  const actor = await getActorWithPermission("platform:manage");
  await recordAuditEvent({
    actorUserId: actor?.userId,
    action: "profile.updated",
    severity: "info",
    targetType: "pricing_package",
    targetId: parsed.data.id,
    metadata: { action: previousId ? "update" : "create", name: parsed.data.name },
  });

  revalidatePricing();
  return {
    ok: true,
    message: previousId ? t("actions.pricing.updated") : t("actions.pricing.created"),
  };
}

export async function deletePricingPackageAction(id: string): Promise<ActionResult> {
  const t = await getTranslations("admin");
  const denied = await requireAdmin();
  if (denied) return denied;

  const trimmed = id.trim();
  if (!trimmed) {
    return { ok: false, code: "INVALID", message: t("actions.pricing.missingId") };
  }

  const result = await deletePricingPackage(trimmed);
  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  revalidatePricing();
  return { ok: true, message: t("actions.pricing.removed") };
}

/** Merge the built-in catalog from academy/data into pricing_packages. */
export async function importDefaultPricingCatalogAction(
  scope: AdminPackageKindFilter = "all",
): Promise<ActionResult> {
  const t = await getTranslations("admin");
  const denied = await requireAdmin();
  if (denied) return denied;

  await seedPricingPackagesFromDefaults(scope);
  revalidatePricing();
  const count =
    scope === "all" ? academyPlans.length : academyPlans.filter((plan) => plan.type === scope).length;
  const scopeLabel = t(
    scope === "one-on-one"
      ? "common.classType.individual"
      : scope === "paired"
        ? "common.classType.paired"
        : "common.all",
  );
  return {
    ok: true,
    message: t("actions.pricing.imported", { scope: scopeLabel, count }),
  };
}
