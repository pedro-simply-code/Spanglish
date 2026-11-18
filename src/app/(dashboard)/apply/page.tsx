import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { ApplyForm } from "@/features/teaching";
import { requireDashboard } from "@/server/auth/session";
import { getMyApplication } from "@/server/teaching/applications";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student");
  return {
    title: t("meta.teach.title"),
    description: t("meta.teach.description"),
  };
}

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
