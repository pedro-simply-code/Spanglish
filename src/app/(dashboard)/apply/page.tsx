import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { ApplyForm } from "@/features/teaching";
import { requireDashboard } from "@/server/auth/session";
import { getMyApplication } from "@/server/teaching/applications";

export const metadata: Metadata = {
  title: "Teach with us",
  description: "Apply to teach live classes at Spanglish",
};

export default function ApplyPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ApplyContent />
    </Suspense>
  );
}

async function ApplyContent() {
  const actor = await requireDashboard("student");
  const application = await getMyApplication(actor);
  return (
    <ApplyForm
      application={
        application
          ? {
              status: application.status,
              headline: application.headline,
              createdAt: application.createdAt,
              reviewNote: application.reviewNote,
            }
          : null
      }
    />
  );
}
