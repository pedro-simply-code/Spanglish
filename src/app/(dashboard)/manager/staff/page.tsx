import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { educatorStaticMetadata } from "@/i18n/static-page-metadata";
import { StaffOverview, type StaffTeacherCard } from "@/features/management";
import { localizedTeacherLevel, teacherLevelFor } from "@/lib/teacher-levels";
import { listTeachers } from "@/server/classes/teachers";
import { getTeacherStats } from "@/server/teaching/stats";

export const metadata: Metadata = educatorStaticMetadata("managerStaff");

export default function ManagerStaffPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <StaffContent />
    </Suspense>
  );
}

async function StaffContent() {
  const t = await getTranslations("educator");
  const teachers = await listTeachers();
  const stats = await getTeacherStats(teachers.map((teacher) => teacher.id));

  const rows: StaffTeacherCard[] = teachers
    .map((teacher) => {
      const row = stats.get(teacher.id)!;
      const level = localizedTeacherLevel(teacherLevelFor(row), t);
      return {
        id: teacher.id,
        name: teacher.name,
        image: teacher.image,
        headline: teacher.headline,
        country: teacher.country,
        bookable: teacher.bookable,
        hasAvailability: teacher.hasAvailability,
        classesTaught: row.classesTaught,
        ratingAverage: row.ratingAverage,
        ratingCount: row.ratingCount,
        level: level.level,
        levelName: level.name,
      };
    })
    .sort((a, b) => b.classesTaught - a.classesTaught);

  return <StaffOverview teachers={rows} />;
}