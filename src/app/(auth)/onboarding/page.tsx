import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell, OnboardingForm } from "@/features/auth";
import { getActorAllowIncompleteProfile } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Complete your profile",
  description: "Tell us a little about you to get started",
};

export default function OnboardingPage() {
  return (
    <AuthShell screen="onboarding">
      <Suspense fallback={null}>
        <OnboardingContent />
      </Suspense>
    </AuthShell>
  );
}

async function OnboardingContent() {
  const actor = await getActorAllowIncompleteProfile();
  if (actor.profileComplete) redirect("/dashboard");

  return <OnboardingForm initialName={actor.name} />;
}
