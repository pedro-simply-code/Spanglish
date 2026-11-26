import { academyPlans } from "@/features/academy";
import type { ClassKind } from "@/server/credits/credits";
import { listPricingPackageRows } from "@/server/pricing/packages";

/** List price per credit when grants have no order (starter bundle = highest per-class rate). */
export async function referenceCreditValueCents(kind: ClassKind): Promise<number> {
  const rows = await listPricingPackageRows({ activeOnly: true });
  // Bundles only: the single-class price would overvalue granted credits.
  const sameKind = rows.filter(
    (row) => row.classType === kind.classType && row.durationMinutes === kind.durationMinutes,
  );
  const bundles = sameKind.filter((row) => row.credits > 1);
  const matches = bundles.length ? bundles : sameKind;
  if (matches.length) {
    return Math.max(...matches.map((row) => row.pricePerClassCents));
  }
  const plan = academyPlans.find(
    (item) => item.type === kind.classType && item.duration === kind.durationMinutes && item.classes > 1,
  );
  if (plan) return Math.round(plan.pricePerClass * 100);
  return kind.durationMinutes >= 50 ? 2_300 : 1_600;
}