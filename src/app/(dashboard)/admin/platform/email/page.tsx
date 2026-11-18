import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { adminStaticMetadata } from "@/i18n/static-page-metadata";
import { env } from "@/env";
import { PlatformEmailOverview } from "@/features/admin";
import { getEmailHealthRows } from "@/server/admin/insights";

export const metadata: Metadata = adminStaticMetadata("email");

export default function AdminPlatformEmailPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const health = await getEmailHealthRows();
  return <PlatformEmailOverview emailProvider={env.EMAIL_PROVIDER} health={health} />;
}
