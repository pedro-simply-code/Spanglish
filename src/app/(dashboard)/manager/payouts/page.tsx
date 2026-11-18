import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { educatorStaticMetadata } from "@/i18n/static-page-metadata";
import { PayoutsContent } from "@/server/teaching/payouts-page";

export const metadata: Metadata = educatorStaticMetadata("managerPayouts");

export default function ManagerPayoutsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ManagerPayoutsContent />
    </Suspense>
  );
}

async function ManagerPayoutsContent() {
  const t = await getTranslations("educator");
  return (
    <PayoutsContent mode="manager" root={{ title: t("shell.roles.manager"), to: "/manager" }} />
  );
}
