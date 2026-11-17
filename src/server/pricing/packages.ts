import { randomUUID } from "node:crypto";
import { and, asc, count, eq, like, max, ne, or } from "drizzle-orm";
import { normalizePricingPackageId } from "@/lib/pricing-package-schema";
import {
  academyPlans,
  type AcademyPlan,
  type ClassDuration,
  type ClassType,
  type PackageSize,
} from "@/features/academy";
import type { AdminPackageDetail, CommercePackageRow } from "@/features/admin";
import type { PricingPackageInput } from "@/lib/pricing-package-schema";
import { db } from "@/server/db";
import { pricingPackages, type PricingPackageRow } from "@/server/db/schema";

export function rowToAcademyPlan(row: PricingPackageRow): AcademyPlan {
  const type = row.classType as ClassType;
  const duration = row.durationMinutes as ClassDuration;
  const classes = row.credits as PackageSize;
  const pricePerClass = row.pricePerClassCents / 100;
  const total = row.totalCents / 100;

  return {
    id: row.id,
    type,
    duration,
    classes,
    name: row.name,
    label: row.label,
    description: row.description,
    pricePerClass,
    total,
    perStudentTotal: type === "paired" ? total / 2 : null,
    perStudentPerClass: type === "paired" ? pricePerClass / 2 : null,
    savings: row.savingsPercent,
  };
}

export function rowToCommercePackage(row: PricingPackageRow): CommercePackageRow {
  return {
    id: row.id,
    name: row.name,
    classType: row.classType === "paired" ? "Paired" : "Individual",
    duration: row.durationMinutes === 25 ? "25 min" : "50 min",
    credits: row.credits,
    priceUsd: row.totalCents / 100,
    active: row.active,
    publishedAt: row.publishedAt
      ? row.publishedAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null,
  };
}

export async function countPricingPackages(options?: {
  activeOnly?: boolean;
  classType?: ClassType;
}) {
  const filters = [];
  if (options?.activeOnly) filters.push(eq(pricingPackages.active, true));
  if (options?.classType) filters.push(eq(pricingPackages.classType, options.classType));
  const [row] = await db
    .select({ value: count() })
    .from(pricingPackages)
    .where(filters.length ? and(...filters) : undefined);
  return row?.value ?? 0;
}

export async function listPricingPackageRows(options?: {
  activeOnly?: boolean;
  classType?: ClassType;
  offset?: number;
  limit?: number;
}) {
  const filters = [];
  if (options?.activeOnly) filters.push(eq(pricingPackages.active, true));
  if (options?.classType) filters.push(eq(pricingPackages.classType, options.classType));
  const rows = await db
    .select()
    .from(pricingPackages)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(pricingPackages.sortOrder), asc(pricingPackages.id))
    .offset(options?.offset ?? 0)
    .limit(options?.limit ?? 500);

  return rows;
}

export async function listAcademyPlansFromDb(options?: {
  activeOnly?: boolean;
  offset?: number;
  limit?: number;
}) {
  const rows = await listPricingPackageRows(options);
  return rows.map(rowToAcademyPlan);
}

/** Public pricing and checkout: active packages only. */
export async function listPublishedAcademyPlans() {
  let rows = await listPricingPackageRows({ activeOnly: true });
  if (rows.length === 0 && (await pricingTableEmpty())) {
    await seedPricingPackagesFromDefaults();
    rows = await listPricingPackageRows({ activeOnly: true });
  }
  if (rows.length > 0) return rows.map(rowToAcademyPlan);
  return academyPlans;
}

export async function listCommercePackagesFromDb(options?: {
  activeOnly?: boolean;
  offset?: number;
  limit?: number;
}) {
  const rows = await listPricingPackageRows(options);
  return rows.map(rowToCommercePackage);
}

export async function getAcademyPlanById(id: string) {
  const candidates = [id, normalizePricingPackageId(id)].filter(
    (value, index, list) => list.indexOf(value) === index,
  );
  for (const packageId of candidates) {
    const [row] = await db.select().from(pricingPackages).where(eq(pricingPackages.id, packageId)).limit(1);
    if (row) return rowToAcademyPlan(row);
  }
  return undefined;
}

export type DefaultCatalogScope = "all" | "one-on-one" | "paired";

/**
 * Inserts or updates rows from the built-in academyPlans table (seed / first deploy).
 * Scope limits which class type is replaced and seeded (admin import per tab).
 */
export async function seedPricingPackagesFromDefaults(scope: DefaultCatalogScope = "all") {
  if (scope === "all" || scope === "one-on-one") {
    await db
      .delete(pricingPackages)
      .where(or(like(pricingPackages.id, "individual-%"), like(pricingPackages.id, "one-on-one-%")));
  }
  if (scope === "all" || scope === "paired") {
    await db.delete(pricingPackages).where(like(pricingPackages.id, "paired-%"));
  }

  const plans =
    scope === "all" ? academyPlans : academyPlans.filter((plan) => plan.type === scope);

  const now = new Date();
  for (const plan of plans) {
    const index = academyPlans.indexOf(plan);
    await db
      .insert(pricingPackages)
      .values({
        id: plan.id,
        classType: plan.type,
        durationMinutes: plan.duration,
        credits: plan.classes,
        name: plan.name,
        label: plan.label,
        description: plan.description,
        pricePerClassCents: Math.round(plan.pricePerClass * 100),
        totalCents: Math.round(plan.total * 100),
        savingsPercent: plan.savings,
        active: true,
        sortOrder: index,
        publishedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: pricingPackages.id,
        set: {
          classType: plan.type,
          durationMinutes: plan.duration,
          credits: plan.classes,
          name: plan.name,
          label: plan.label,
          description: plan.description,
          pricePerClassCents: Math.round(plan.pricePerClass * 100),
          totalCents: Math.round(plan.total * 100),
          savingsPercent: plan.savings,
          sortOrder: index,
          updatedAt: now,
        },
      });
  }
}

export async function pricingTableEmpty() {
  const total = await countPricingPackages();
  return total === 0;
}

export function rowToAdminPackageDetail(row: PricingPackageRow): AdminPackageDetail {
  return {
    ...rowToCommercePackage(row),
    classTypeCode: row.classType,
    durationMinutes: row.durationMinutes as ClassDuration,
    label: row.label,
    description: row.description,
    pricePerClassUsd: row.pricePerClassCents / 100,
    totalUsd: row.totalCents / 100,
    savingsPercent: row.savingsPercent,
    sortOrder: row.sortOrder,
  };
}

async function nextSortOrder() {
  const [row] = await db.select({ value: max(pricingPackages.sortOrder) }).from(pricingPackages);
  return (row?.value ?? -1) + 1;
}

async function variantTaken(
  classType: PricingPackageInput["classType"],
  durationMinutes: number,
  credits: number,
  excludeId?: string,
) {
  const [row] = await db
    .select({ id: pricingPackages.id })
    .from(pricingPackages)
    .where(
      and(
        eq(pricingPackages.classType, classType),
        eq(pricingPackages.durationMinutes, durationMinutes),
        eq(pricingPackages.credits, credits),
        excludeId ? ne(pricingPackages.id, excludeId) : undefined,
      ),
    )
    .limit(1);
  return Boolean(row);
}

export type SavePackageResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function savePricingPackage(
  input: PricingPackageInput,
  options?: { previousId?: string },
): Promise<SavePackageResult> {
  const now = new Date();
  const previousId = options?.previousId?.trim();

  if (await variantTaken(input.classType, input.durationMinutes, input.credits, input.id)) {
    return {
      ok: false,
      code: "VARIANT_EXISTS",
      message: "Another package already uses this class type, duration, and credit count.",
    };
  }

  const payload = {
    id: input.id,
    classType: input.classType,
    durationMinutes: input.durationMinutes,
    credits: input.credits,
    name: input.name,
    label: input.label,
    description: input.description,
    pricePerClassCents: Math.round(input.pricePerClassUsd * 100),
    totalCents: Math.round(input.totalUsd * 100),
    savingsPercent: input.savingsPercent,
    active: input.active,
    updatedAt: now,
    publishedAt: input.active ? now : null,
  };

  const [existing] = await db
    .select()
    .from(pricingPackages)
    .where(eq(pricingPackages.id, previousId ?? input.id))
    .limit(1);

  if (existing) {
    if (previousId && previousId !== input.id) {
      const [idCollision] = await db
        .select({ id: pricingPackages.id })
        .from(pricingPackages)
        .where(eq(pricingPackages.id, input.id))
        .limit(1);
      if (idCollision) {
        return { ok: false, code: "ID_TAKEN", message: "That package id is already in use." };
      }
      await db.delete(pricingPackages).where(eq(pricingPackages.id, previousId));
      await db.insert(pricingPackages).values({
        ...payload,
        sortOrder: existing.sortOrder,
        createdAt: existing.createdAt,
      });
      return { ok: true };
    }

    await db
      .update(pricingPackages)
      .set({
        ...payload,
        publishedAt: input.active
          ? (existing.publishedAt ?? now)
          : null,
      })
      .where(eq(pricingPackages.id, input.id));
    return { ok: true };
  }

  const [idCollision] = await db
    .select({ id: pricingPackages.id })
    .from(pricingPackages)
    .where(eq(pricingPackages.id, input.id))
    .limit(1);
  if (idCollision) {
    return { ok: false, code: "ID_TAKEN", message: "That package id is already in use." };
  }

  await db.insert(pricingPackages).values({
    ...payload,
    id: input.id || randomUUID(),
    sortOrder: await nextSortOrder(),
    createdAt: now,
  });
  return { ok: true };
}

export async function deletePricingPackage(id: string): Promise<SavePackageResult> {
  const [row] = await db
    .select({ id: pricingPackages.id })
    .from(pricingPackages)
    .where(eq(pricingPackages.id, id))
    .limit(1);
  if (!row) {
    return { ok: false, code: "NOT_FOUND", message: "Package not found." };
  }
  await db.delete(pricingPackages).where(eq(pricingPackages.id, id));
  return { ok: true };
}