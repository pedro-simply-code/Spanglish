import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { adminStaticMetadata } from "@/i18n/static-page-metadata";
import { AuditOverview } from "@/features/management";
import { listAuditEvents } from "@/server/audit/audit-log";
import { getActorWithPermission } from "@/server/auth/session";

export const metadata: Metadata = adminStaticMetadata("audit");

export default function AdminAuditPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <AuditContent />
    </Suspense>
  );
}

async function AuditContent() {
  const actor = await getActorWithPermission("platform:manage");
  if (!actor) redirect("/dashboard");

  const entries = await listAuditEvents({ limit: 200 });
  return <AuditOverview entries={entries} />;
}
