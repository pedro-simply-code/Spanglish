import { Suspense } from "react";
import { requireDashboard } from "@/server/auth/session";

/** Manager routes render only while the Manager dashboard is active. */
export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <ManagerGuard>{children}</ManagerGuard>
    </Suspense>
  );
}

async function ManagerGuard({ children }: { children: React.ReactNode }) {
  await requireDashboard("manager");
  return children;
}
