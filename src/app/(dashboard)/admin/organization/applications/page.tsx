import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { adminStaticMetadata } from "@/i18n/static-page-metadata";
import { ApplicationsContent } from "@/server/teaching/applications-page";

export const metadata: Metadata = adminStaticMetadata("applications");

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ApplicationsPageContent />
    </Suspense>
  );
}

async function ApplicationsPageContent() {
  const t = await getTranslations("admin");
  return (
    <ApplicationsContent root={{ title: t("common.admin"), to: "/admin" }} />
  );
}
