import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { educatorStaticMetadata } from "@/i18n/static-page-metadata";
import { StudentsCreditsContent } from "@/server/enrollment/students-credits";

export const metadata: Metadata = educatorStaticMetadata("managerStudents");

export default function StudentsCreditsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ManagerStudentsPageContent />
    </Suspense>
  );
}

async function ManagerStudentsPageContent() {
  const t = await getTranslations("educator");
  return (
    <StudentsCreditsContent root={{ title: t("shell.roles.manager"), to: "/manager" }} />
  );
}
