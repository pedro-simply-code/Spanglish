import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { StudentHub } from "@/features/student-hub";

/*
 * The student dashboard sections; most group related pages as tabs:
 *   /home     Inicio
 *   /classes  Mis clases  (classes · lessons · book)
 *   /speak    Habla con la IA   (own page, see ai-section.tsx)
 *   /chat     Chatea con la IA  (own page)
 *   /study    Estudiar    (practice · vocabulary · materials)
 *   /progress Mi progreso (progress · achievements)
 *   /credits  Mis créditos (credits · buy)
 */
export const studentHubs = {
  classes: { path: "/classes", tabs: ["classes", "lessons", "book"] },
  study: { path: "/study", tabs: ["practice", "vocabulary", "materials"] },
  progress: { path: "/progress", tabs: ["progress", "achievements"] },
  credits: { path: "/credits", tabs: ["credits", "buy"] },
} as const;

export type StudentHubKey = keyof typeof studentHubs;
export type StudentHubTabKey<K extends StudentHubKey> = (typeof studentHubs)[K]["tabs"][number];

/** The requested tab, or the hub's first tab. */
export function pickTab<K extends StudentHubKey>(
  hub: K,
  value: string | string[] | undefined,
): StudentHubTabKey<K> {
  const tabs = studentHubs[hub].tabs as readonly string[];
  return (typeof value === "string" && tabs.includes(value) ? value : tabs[0]) as StudentHubTabKey<K>;
}

export async function StudentHubPage<K extends StudentHubKey>({
  hub,
  active,
  children,
}: {
  hub: K;
  active: StudentHubTabKey<K>;
  children: ReactNode;
}) {
  const translate = await getTranslations("student.hub");
  const t = (key: string) => translate(key as Parameters<typeof translate>[0]);
  const { path, tabs } = studentHubs[hub];
  return (
    <StudentHub
      title={t(`${hub}.title`)}
      subtitle={t(`${hub}.subtitle`)}
      active={active}
      tabs={tabs.map((tab, index) => ({
        value: tab,
        label: t(`${hub}.tabs.${tab}`),
        href: index === 0 ? path : `${path}?tab=${tab}`,
      }))}
    >
      {children}
    </StudentHub>
  );
}
