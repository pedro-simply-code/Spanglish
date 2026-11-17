import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { TeacherMaterialsOverview } from "@/features/materials";
import { getActor } from "@/server/auth/session";
import { listLibraryForStaffOrTeacher } from "@/server/materials/library";

export const metadata: Metadata = {
  title: "Materials",
  description: "Create and share teaching materials",
};

export default function TeacherMaterialsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <TeacherMaterials />
    </Suspense>
  );
}

async function TeacherMaterials() {
  const actor = await getActor();
  return (
    <TeacherMaterialsOverview viewerId={actor.userId} materials={await listLibraryForStaffOrTeacher(actor)} />
  );
}
