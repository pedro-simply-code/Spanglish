import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { ApplicationsContent } from "@/server/teaching/applications-page";

export const metadata: Metadata = {
  title: "Teacher applications",
  description: "Review applications to teach",
};

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ApplicationsContent root={{ title: "Manager", to: "/manager" }} />
    </Suspense>
  );
}
