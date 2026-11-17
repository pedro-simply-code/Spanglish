export type AdminPackageKindFilter = "all" | "one-on-one" | "paired";

export function parseAdminPackageKindParam(value: string | undefined): AdminPackageKindFilter {
  if (value === "one-on-one" || value === "individual") return "one-on-one";
  if (value === "paired") return "paired";
  return "all";
}

export function adminPackageKindToClassType(
  kind: AdminPackageKindFilter,
): "one-on-one" | "paired" | undefined {
  return kind === "all" ? undefined : kind;
}