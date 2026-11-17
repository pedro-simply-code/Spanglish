import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { requireDashboard } from "@/server/auth/session";

/** Admin routes render only while the Admin dashboard is active. */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <AdminRouteContent>{children}</AdminRouteContent>
    </Suspense>
  );
}

async function AdminRouteContent({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboard("admin");
  return children;
}