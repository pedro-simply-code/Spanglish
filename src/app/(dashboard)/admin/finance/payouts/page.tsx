import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { adminStaticMetadata } from "@/i18n/static-page-metadata";
import { PayoutsContent } from "@/server/teaching/payouts-page";

export const metadata: Metadata = adminStaticMetadata("payouts");

export default function AdminFinancePayoutsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <AdminPayoutsContent />
    </Suspense>
  );
}

async function AdminPayoutsContent() {
  const t = await getTranslations("admin");
  return (
    <PayoutsContent mode="admin" root={{ title: t("common.admin"), to: "/admin" }} />
  );
}
