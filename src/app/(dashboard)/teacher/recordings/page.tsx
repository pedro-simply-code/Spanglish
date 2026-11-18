import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import {
  RecordingsOverview,
  loadStoredClassRecordingsForActor,
} from "@/features/recordings";
import { getActor } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("educator.metadata.recordings");
  return { title: t("title"), description: t("description") };
}

export default function TeacherRecordingsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <TeacherRecordingsContent />
    </Suspense>
  );
}

async function TeacherRecordingsContent() {
  await connection();
  const actor = await getActor();
  const storedRecordings = await loadStoredClassRecordingsForActor(actor);

  return <RecordingsOverview storedRecordings={storedRecordings} />;
}