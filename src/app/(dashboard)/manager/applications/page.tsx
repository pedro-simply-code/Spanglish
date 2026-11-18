import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { educatorStaticMetadata } from "@/i18n/static-page-metadata";
import { ApplicationsContent } from "@/server/teaching/applications-page";

export const metadata: Metadata = educatorStaticMetadata("managerApplications");

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ManagerApplicationsPageContent />
    </Suspense>
  );
}

async function ManagerApplicationsPageContent() {
  const t = await getTranslations("educator");
  return (
    <ApplicationsContent root={{ title: t("shell.roles.manager"), to: "/manager" }} />
  );
}
