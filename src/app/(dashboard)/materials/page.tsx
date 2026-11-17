import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { StudentMaterialsOverview } from "@/features/materials";
import { getActor } from "@/server/auth/session";
import { listMaterialsForStudent } from "@/server/materials/library";

export const metadata: Metadata = {
  title: "Materials",
  description: "Materials shared by your teachers",
};

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
