import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { getClassRelation, loadClassForActor } from "@/features/classes";
import { ClassDetail } from "@/features/classroom";
import { appNow } from "@/lib/app-clock";
import { getClassPolicy } from "@/server/classes/class-policy";
import { getActor } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { resolveTimeZone } from "@/lib/timezone";
import { listClassRecordings } from "@/server/classes/recordings";
import { listClassTranscript } from "@/server/classes/class-transcript-repository";
import { getLessonSummary } from "@/server/ai/lesson-summary";
import { getClassLearning } from "@/server/learning/class-learning";
import { listLibraryForStaffOrTeacher } from "@/server/materials/library";
import { getMyRating } from "@/server/teaching/ratings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student");
  return {
    title: t("meta.classDetails.title"),
    description: t("meta.classDetails.description"),
  };
}

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
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const [item, relation, profile, myRating, recordings, transcript, learning, summary] = await Promise.all([
    loadClassForActor(id, actor),
    getClassRelation(id, actor),
    getUserProfile(actor.userId),
    getMyRating(id, actor.userId),
    listClassRecordings(actor, id),
    listClassTranscript(actor, id),
    getClassLearning(actor, id),
    getLessonSummary(actor, id, locale),
  ]);

  if (!item || !relation) {
    notFound();
  }

  const library =
    relation === "teacher" || relation === "staff"
      ? (await listLibraryForStaffOrTeacher(actor))
          .filter((material) => material.status === "published")
          .map((material) => ({ id: material.id, title: material.title, kind: material.kind }))
      : [];

  return (
    <ClassDetail
      item={item}
      now={appNow()}
      policy={getClassPolicy()}
      relation={relation}
      viewerId={actor.userId}
      viewerTimeZone={resolveTimeZone(profile?.timezone)}
      myRating={myRating}
      recordings={recordings}
      transcript={transcript}
      summary={summary}
      learning={learning}
      library={library}
    />
  );
}
