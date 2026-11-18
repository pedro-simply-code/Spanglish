import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { TeacherMaterialsOverview } from "@/features/materials";
import { getActor } from "@/server/auth/session";
import { listLibraryForStaffOrTeacher } from "@/server/materials/library";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("educator.metadata.teacherMaterials");
  return { title: t("title"), description: t("description") };
}

export default function TeacherMaterialsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <TeacherMaterials />
    </Suspense>
  );
}

async function TeacherMaterials() {
  await connection();
  const actor = await getActor();
  return (
    <TeacherMaterialsOverview viewerId={actor.userId} materials={await listLibraryForStaffOrTeacher(actor)} />
  );
}
