import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { TeacherStudents } from "@/features/materials";
import { educatorStaticMetadata } from "@/i18n/static-page-metadata";

export const metadata: Metadata = educatorStaticMetadata("students");

export default function TeacherStudentsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <TeacherStudents />
    </Suspense>
  );
}
