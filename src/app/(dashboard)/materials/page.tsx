import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { StudentMaterialsOverview } from "@/features/materials";
import { getActor } from "@/server/auth/session";
import { listMaterialsForStudent } from "@/server/materials/library";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("educator.metadata.materials");
  return { title: t("title"), description: t("description") };
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <StudentMaterials />
    </Suspense>
  );
}

async function StudentMaterials() {
  const actor = await getActor();
  return <StudentMaterialsOverview materials={await listMaterialsForStudent(actor.userId)} />;
}
