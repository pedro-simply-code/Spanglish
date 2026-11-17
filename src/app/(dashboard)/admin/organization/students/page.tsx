import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { StudentsCreditsContent } from "@/server/enrollment/students-credits";

export const metadata: Metadata = {
  title: "Students and credits",
  description: "Pairs, class credits and package purchases",
};

export default function StudentsCreditsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <StudentsCreditsContent root={{ title: "Admin", to: "/admin" }} />
    </Suspense>
  );
}
