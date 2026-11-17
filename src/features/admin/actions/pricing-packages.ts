"use server";

import { revalidatePath } from "next/cache";
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
  const actor = await getActorWithPermission("platform:manage");
  if (!actor) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only the academy admin can change packages.",
    };
  }
  return null;
}

export async function savePricingPackageAction(
  input: PricingPackageInput,
  previousId?: string,
): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = pricingPackageInputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      code: issue?.path.join("_").toUpperCase() || "INVALID",
      message: issue?.message ?? "Invalid package data.",
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
  return { ok: true, message: previousId ? "Package updated." : "Package created." };
}

export async function deletePricingPackageAction(id: string): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const trimmed = id.trim();
  if (!trimmed) {
    return { ok: false, code: "INVALID", message: "Missing package id." };
  }

  const result = await deletePricingPackage(trimmed);
  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  revalidatePricing();
  return { ok: true, message: "Package removed." };
}

/** Merge the built-in catalog from academy/data into pricing_packages. */
export async function importDefaultPricingCatalogAction(
  scope: AdminPackageKindFilter = "all",
): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  await seedPricingPackagesFromDefaults(scope);
  revalidatePricing();
  const count =
    scope === "all" ? academyPlans.length : academyPlans.filter((plan) => plan.type === scope).length;
  const scopeLabel =
    scope === "one-on-one" ? "individual" : scope === "paired" ? "paired" : "full";
  return {
    ok: true,
    message:
      count === 1
        ? `Default ${scopeLabel} catalog imported (1 package).`
        : `Default ${scopeLabel} catalog imported (${count} packages).`,
  };
}