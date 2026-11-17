import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { ChatsOverview } from "@/features/chats";
import { getActor } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Chat",
  description: "Spanglish messenger app",
};

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
