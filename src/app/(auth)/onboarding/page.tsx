import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AuthShell, OnboardingForm } from "@/features/auth";
import { getActorAllowIncompleteProfile } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("onboardingTitle"),
    description: t("onboardingDescription"),
  };
}

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
