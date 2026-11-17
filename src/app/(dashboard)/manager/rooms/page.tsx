import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { appNowDate } from "@/lib/app-clock";
import { RoomsOverview } from "@/features/management";
import {
  academyDayKey,
  listManagerClassroomsForDay,
  parseAcademyDayKey,
} from "@/server/classes/manager-rooms";

export const metadata: Metadata = {
  title: "Rooms",
  description: "Live class rooms and provider status",
};

type ManagerRoomsPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default function ManagerRoomsPage({ searchParams }: ManagerRoomsPageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <RoomsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function RoomsContent({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await connection();
  const query = await searchParams;
  const day = parseAcademyDayKey(query.date) ?? academyDayKey(appNowDate());
  const rooms = await listManagerClassroomsForDay(day);
  return <RoomsOverview rooms={rooms} day={day} />;
}