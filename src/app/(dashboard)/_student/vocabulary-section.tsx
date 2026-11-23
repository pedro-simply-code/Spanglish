import { VocabularyOverview } from "@/features/vocabulary";
import { appNow } from "@/lib/app-clock";
import { requireDashboard } from "@/server/auth/session";
import { listStudentWords } from "@/server/learning/vocabulary";

export async function VocabularySection() {
  const actor = await requireDashboard("student");
  const words = await listStudentWords(actor.userId);
  return <VocabularyOverview words={words} now={appNow()} />;
}
