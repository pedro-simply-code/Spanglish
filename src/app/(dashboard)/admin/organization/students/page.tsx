import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { adminStaticMetadata } from "@/i18n/static-page-metadata";
import { StudentsCreditsContent } from "@/server/enrollment/students-credits";

export const metadata: Metadata = adminStaticMetadata("students");

export default function StudentsCreditsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <StudentsCreditsPageContent />
    </Suspense>
  );
}

async function StudentsCreditsPageContent() {
  const t = await getTranslations("admin");
  return (
    <StudentsCreditsContent root={{ title: t("common.admin"), to: "/admin" }} />
  );
}
