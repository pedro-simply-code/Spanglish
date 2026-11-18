import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { ChatsOverview } from "@/features/chats";
import { getActor } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apps");
  return {
    title: t("metadata.chat.title"),
    description: t("metadata.chat.description"),
  };
}

export default function ChatsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ChatsContent />
    </Suspense>
  );
}

async function ChatsContent() {
  const actor = await getActor();
  // The admin dashboard has no chat.
  if (actor.activeRole === "admin") redirect("/admin");
  return <ChatsOverview />;
}
