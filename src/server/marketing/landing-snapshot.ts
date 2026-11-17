import { connection } from "next/server";
import type { MarketingLandingSnapshot } from "@/features/marketing/data";
import { listTeachers } from "@/server/classes/teachers";
import { countSessions } from "@/server/classes/class-repository";
import { listPublishedAcademyPlans } from "@/server/pricing/packages";

export type { MarketingLandingSnapshot };

export async function getMarketingLandingSnapshot(): Promise<MarketingLandingSnapshot> {
  await connection();
  const [teachers, plans, sessions] = await Promise.all([
    listTeachers(),
    listPublishedAcademyPlans(),
    countSessions(),
  ]);

  const bookableTeacherCount = teachers.filter(
    (teacher) => teacher.bookable && teacher.hasAvailability,
  ).length;

  const sortedByPrice = [...plans].sort((a, b) => a.pricePerClass - b.pricePerClass);
  const startingPricePerClass = sortedByPrice[0]?.pricePerClass ?? null;

  return {
    teacherCount: teachers.length,
    bookableTeacherCount,
    sessionsTotal: Math.max(0, sessions.total - sessions.canceled),
    startingPricePerClass,
    publishedPlans: plans,
  };
}