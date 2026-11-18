import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { SettingsOverview } from "@/features/settings";
import { getActor } from "@/server/auth/session";
import { getUserProfile, userHasPassword } from "@/server/auth/user-repository";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shell");
  return {
    title: t("settings.metadata.title"),
    description: t("settings.metadata.description"),
  };
}

type SettingsPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default function SettingsPage({ searchParams }: SettingsPageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <SettingsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SettingsContent({ searchParams }: SettingsPageProps) {
  const [actor, query] = await Promise.all([getActor(), searchParams]);

  const [hasPassword, profile] = await Promise.all([
    userHasPassword(actor.userId),
    getUserProfile(actor.userId),
  ]);

  return (
    <SettingsOverview
      actor={actor}
      hasPassword={hasPassword}
      initialTab={query.tab === "security" ? "security" : undefined}
      profile={{
        name: profile?.name ?? actor.name,
        email: actor.email,
        locale: profile?.locale ?? "en",
        timezone: profile?.timezone ?? null,
        learningLanguage: profile?.learningLanguage ?? null,
        level: profile?.level ?? null,
        goal: profile?.goal ?? null,
      }}
    />
  );
}
