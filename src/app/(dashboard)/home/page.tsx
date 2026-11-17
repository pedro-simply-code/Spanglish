import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { ProfileCompletionCard } from "@/features/auth";
import { HomeOverview } from "@/features/home";
import { getProfileCompletion } from "@/server/auth/profile-completion";
import { requireDashboard } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Student dashboard",
  description: "Your Spanglish learning plan for today",
};

export default function HomePage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const actor = await requireDashboard("student");
  const firstName = actor.name.split(" ")[0] || actor.name;

  const completion = await getProfileCompletion(actor);

  return (
    <>
      <ProfileCompletionCard completion={completion} />
      <HomeOverview firstName={firstName} />
    </>
  );
}
