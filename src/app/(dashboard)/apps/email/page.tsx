import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { EmailAppContent } from "@/server/email/messages-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apps");
  return {
    title: t("metadata.email.title"),
    description: t("metadata.email.description"),
  };
}

export default function EmailPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <EmailAppContent />
    </Suspense>
  );
}
