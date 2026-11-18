import { Suspense } from "react";
import { connection } from "next/server";
import { requireDashboard } from "@/server/auth/session";

/**
 * Protects the whole teaching workspace. Only the active dashboard may render:
 * opening /teacher with another dashboard selected redirects to that one.
 */
export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <TeacherGuard>{children}</TeacherGuard>
    </Suspense>
  );
}

async function TeacherGuard({ children }: { children: React.ReactNode }) {
  await connection();
  await requireDashboard("teacher");
  return children;
}
