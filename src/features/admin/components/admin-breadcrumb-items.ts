export type AdminCrumb = { title: string; to?: string };

type Translator = (key: string) => string;

export function adminBreadcrumb(
  t: Translator,
  section: string,
  page: string,
  sectionHref?: string,
): AdminCrumb[] {
  const items: AdminCrumb[] = [{ title: t("common.admin"), to: "/admin" }];
  if (section) {
    items.push(sectionHref ? { title: section, to: sectionHref } : { title: section });
  }
  items.push({ title: page });
  return items;
}
