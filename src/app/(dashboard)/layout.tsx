import { Suspense } from "react";
import { DashboardShellFallback } from "@/components/layout/dashboard-shell-fallback";
import { SessionShell } from "@/components/layout/session-shell";

/** Session and cookies are read inside SessionShell (Suspense) for cacheComponents. */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardShellFallback />}>
      <SessionShell>{children}</SessionShell>
    </Suspense>
  );
}
