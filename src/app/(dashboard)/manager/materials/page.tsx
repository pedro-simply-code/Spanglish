import type { Metadata } from "next";
import { Suspense } from "react";
import { educatorStaticMetadata } from "@/i18n/static-page-metadata";
import { notFound } from "next/navigation";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { MaterialsModeration } from "@/features/materials";
import { getActorWithPermission } from "@/server/auth/session";
import { listModerationQueue } from "@/server/materials/library";

export const metadata: Metadata = educatorStaticMetadata("managerMaterials");

export default function ManagerMaterialsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ModerationContent />
    </Suspense>
  );
}

async function ModerationContent() {
  const actor = await getActorWithPermission("materials:moderate");
  if (!actor) notFound();
  return <MaterialsModeration materials={await listModerationQueue()} />;
}
