import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { StaffOverview, type StaffTeacherCard } from "@/features/management";
import { teacherLevelFor } from "@/lib/teacher-levels";
import { listTeachers } from "@/server/classes/teachers";
import { getTeacherStats } from "@/server/teaching/stats";

export const metadata: Metadata = {
  title: "Staff",
  description: "Teachers and teaching load",
};

export default function ManagerStaffPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <StaffContent />
    </Suspense>
  );
}

async function StaffContent() {
  const teachers = await listTeachers();
  const stats = await getTeacherStats(teachers.map((teacher) => teacher.id));

  const rows: StaffTeacherCard[] = teachers
    .map((teacher) => {
      const row = stats.get(teacher.id)!;
      const level = teacherLevelFor(row);
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