import type { Metadata } from "next";
import {
  RecordingsOverview,
  loadStoredClassRecordingsForActor,
} from "@/features/recordings";
import { requireDashboard } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Recordings",
  description: "Class recordings and transcripts",
};

export default async function TeacherRecordingsPage() {
  const actor = await requireDashboard("teacher");
  const storedRecordings = await loadStoredClassRecordingsForActor(actor);

  return (
    <RecordingsOverview
      ownerName={actor.name}
      storedRecordings={storedRecordings}
    />
  );
}
