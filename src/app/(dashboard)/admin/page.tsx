import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { adminStaticMetadata } from "@/i18n/static-page-metadata";
import { AdminTwoFactorNotice } from "@/features/auth";
import { ExecutiveOverview } from "@/features/admin";
import { resolveTimeZone } from "@/lib/timezone";
import { getAdminHome } from "@/server/admin/admin-home";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";

export const metadata: Metadata = adminStaticMetadata("dashboard");

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <AdminDashboardContent />
    </Suspense>
  );
}

async function AdminDashboardContent() {
  const actor = await requireDashboard("admin");
  const profile = await getUserProfile(actor.userId);
  const timeZone = resolveTimeZone(profile?.timezone);
  const home = await getAdminHome(timeZone);

  return (
    <>
      {actor.twoFactorEnabled ? null : <AdminTwoFactorNotice userId={actor.userId} />}
      <ExecutiveOverview firstName={actor.name.trim().split(/\s+/)[0] || actor.name} timeZone={timeZone} home={home} />
    </>
  );
}
