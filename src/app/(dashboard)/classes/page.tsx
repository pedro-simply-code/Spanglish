import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { BookSection } from "@/app/(dashboard)/_student/book-section";
import { ClassesSection } from "@/app/(dashboard)/_student/classes-section";
import { StudentHubPage, pickTab } from "@/app/(dashboard)/_student/hub";
import { LessonsSection } from "@/app/(dashboard)/_student/lessons-section";
import { loadClassesForActor } from "@/features/classes";
import { ClassesOverview } from "@/features/classroom";
import { appNow } from "@/lib/app-clock";
import { getClassPolicy } from "@/server/classes/class-policy";
import { getActor } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student");
  return {
    title: t("meta.classes.title"),
    description: t("meta.classes.description"),
  };
}

type ClassesPageProps = { searchParams: Promise<{ tab?: string | string[] }> };

export default function ClassesPage({ searchParams }: ClassesPageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ClassesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ClassesContent({ searchParams }: ClassesPageProps) {
  const [actor, query] = await Promise.all([getActor(), searchParams]);
  if (actor.activeRole === "manager") {
    redirect("/apps/calendar");
  }
  // Students: "Mis clases" with their classes, past lessons and booking.
  if (actor.activeRole === "student") {
    const tab = pickTab("classes", query.tab);
    return (
      <StudentHubPage hub="classes" active={tab}>
        {tab === "classes" ? <ClassesSection actor={actor} /> : null}
        {tab === "lessons" ? <LessonsSection /> : null}
        {tab === "book" ? <BookSection /> : null}
      </StudentHubPage>
    );
  }
  // Teachers and the admin: the plain class list.
  const policy = getClassPolicy();
  const staffView = actor.activeRole === "admin";
  const items = await loadClassesForActor(actor);

  return (
    <ClassesOverview
      policy={policy}
      items={items}
      now={appNow()}
      viewMode={staffView ? "staff" : "student"}
      viewerId={actor.userId}
      credits={null}
    />
  );
}
