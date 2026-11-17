import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { TeacherRatesEditor } from "@/features/payouts";
import { teacherLevelFor } from "@/lib/teacher-levels";
import { listTeachers } from "@/server/classes/teachers";
import { getPayoutSettings } from "@/server/teaching/earnings";
import { getTeacherStats } from "@/server/teaching/stats";
import { requestTime } from "@/server/request-time";

export const metadata: Metadata = {
  title: "Teacher pay rates",
  description: "Pay per delivered class and teacher levels",
};

export default function AdminFinanceTeacherRatesPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requestTime();
  const [settings, teachers] = await Promise.all([getPayoutSettings(), listTeachers()]);
  const stats = await getTeacherStats(teachers.map((teacher) => teacher.id));
  const teachersByLevel: Record<number, number> = {};
  for (const value of stats.values()) {
    const level = teacherLevelFor(value).level;
    teachersByLevel[level] = (teachersByLevel[level] ?? 0) + 1;
  }
  return <TeacherRatesEditor settings={settings} teachersByLevel={teachersByLevel} />;
}