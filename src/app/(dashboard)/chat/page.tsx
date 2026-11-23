import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { AiSection } from "@/app/(dashboard)/_student/ai-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.ai.pages.chat");
  return { title: t("title"), description: t("subtitle") };
}

type PageProps = { searchParams: Promise<{ c?: string | string[] }> };

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: PageProps) {
  const query = await searchParams;
  return <AiSection kind="chat" conversationId={typeof query.c === "string" ? query.c : undefined} />;
}
