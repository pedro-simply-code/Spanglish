const materialDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York",
});

const materialDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

export function formatMaterialDate(iso: string) {
  return materialDateFormatter.format(new Date(iso));
}

export function formatMaterialDateTime(iso: string) {
  return materialDateTimeFormatter.format(new Date(iso));
}

export function formatMaterialKind(kind: string) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}
