import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { getClassRelation, loadClassForActor } from "@/features/classes";
import { ClassDetail } from "@/features/classroom";
import { appNow } from "@/lib/app-clock";
import { getClassPolicy } from "@/server/classes/class-policy";
import { getActor } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { resolveTimeZone } from "@/lib/timezone";
import { getMyRating } from "@/server/teaching/ratings";

export const metadata: Metadata = {
  title: "Class details",
  description: "Agenda, materials, and the live meeting room",
};

type ClassDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function ClassDetailPage({ params }: ClassDetailPageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ClassDetailContent params={params} />
    </Suspense>
  );
}

async function ClassDetailContent({ params }: ClassDetailPageProps) {
  const { id } = await params;
  const actor = await getActor();
  const [item, relation, profile, myRating] = await Promise.all([
    loadClassForActor(id, actor),
    getClassRelation(id, actor),
    getUserProfile(actor.userId),
    getMyRating(id, actor.userId),
  ]);

  if (!item || !relation) {
    notFound();
  }

  return (
    <ClassDetail
      item={item}
      now={appNow()}
      policy={getClassPolicy()}
      relation={relation}
      viewerId={actor.userId}
      viewerTimeZone={resolveTimeZone(profile?.timezone)}
      myRating={myRating}
    />
  );
}
