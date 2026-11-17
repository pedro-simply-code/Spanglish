import { z } from "zod";

const packageId = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.");

export const pricingPackageInputSchema = z
  .object({
    id: packageId,
    classType: z.enum(["one-on-one", "paired"]),
    durationMinutes: z.union([z.literal(25), z.literal(50)]),
    credits: z.number().int().min(1).max(200),
    name: z.string().trim().min(1).max(120),
    label: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(500),
    pricePerClassUsd: z.number().positive().max(500),
    totalUsd: z.number().positive().max(50_000),
    savingsPercent: z.number().int().min(0).max(99).default(0),
    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const expected = Math.round(data.pricePerClassUsd * data.credits);
    if (Math.abs(expected - data.totalUsd) > 0.02) {
      ctx.addIssue({
        code: "custom",
        message: "Total should equal price per class × credits.",
        path: ["totalUsd"],
      });
    }
  });

export type PricingPackageInput = z.infer<typeof pricingPackageInputSchema>;

export function suggestedPackageId(input: {
  classType: "one-on-one" | "paired";
  durationMinutes: 25 | 50;
  credits: number;
}) {
  const slug = input.classType === "one-on-one" ? "individual" : input.classType;
  return `${slug}-${input.durationMinutes}-${input.credits}`;
}

/** Accept old checkout URLs and admin bookmarks that used `one-on-one-` ids. */
export function normalizePricingPackageId(id: string) {
  return id.replace(/^one-on-one-/, "individual-");
}