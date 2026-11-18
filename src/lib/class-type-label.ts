import type { useTranslations } from "next-intl";

/** Stored class type in the database and APIs. */
export type ClassTypeCode = "one-on-one" | "paired";

/** Scoped student translator used by pure presentation helpers. */
export type StudentClassTypeTranslator = ReturnType<typeof useTranslations<"student">>;

/**
 * User-facing label (never show the raw `one-on-one` code).
 * The translator is optional so shared callers keep their existing English output.
 */
export function classTypeLabel(
  type: ClassTypeCode | string,
  t?: StudentClassTypeTranslator,
): string {
  return t
    ? type === "paired"
      ? t("classTypes.paired")
      : t("classTypes.individual")
    : type === "paired"
      ? "Paired"
      : "Individual";
}
