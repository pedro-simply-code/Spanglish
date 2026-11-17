/** Stored class type in the database and APIs. */
export type ClassTypeCode = "one-on-one" | "paired";

/** User-facing label (never show the raw `one-on-one` code). */
export function classTypeLabel(type: ClassTypeCode | string): string {
  return type === "paired" ? "Paired" : "Individual";
}