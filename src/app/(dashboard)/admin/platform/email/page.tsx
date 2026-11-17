import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { env } from "@/env";
import { PlatformEmailOverview } from "@/features/admin";
import { getEmailHealthRows } from "@/server/admin/insights";

export const metadata: Metadata = {
  title: "Email deliverability",
  description: "Transactional email health and bounces",
};

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