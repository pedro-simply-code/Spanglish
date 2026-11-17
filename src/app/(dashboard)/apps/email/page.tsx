import { Suspense } from "react";
import type { Metadata } from "next";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { EmailAppContent } from "@/server/email/messages-page";

export const metadata: Metadata = {
  title: "Email",
  description: "Spanglish email app",
};

export default function EmailPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <EmailAppContent />
    </Suspense>
  );
}
