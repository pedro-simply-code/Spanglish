export type AdminCrumb = { title: string; to?: string };

export function adminBreadcrumb(
  section: string,
  page: string,
  sectionHref?: string,
): AdminCrumb[] {
  const items: AdminCrumb[] = [{ title: "Admin", to: "/admin" }];
  if (section) {
    items.push(sectionHref ? { title: section, to: sectionHref } : { title: section });
  }
  items.push({ title: page });
  return items;
}