import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { MarketingLanding, MarketingLoading } from "@/features/marketing";
import { LocaleProvider } from "@/i18n/locale-provider";
import { getMarketingLandingSnapshot } from "@/server/marketing/landing-snapshot";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return {
    title: t("metadata.homeTitle"),
    description: t("metadata.homeDescription"),
  };
}

function LandingFallback() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-[60vh] items-center justify-center bg-[var(--background)]"
          aria-busy
        />
      }
    >
      <LocaleProvider>
        <MarketingLoading minHeight="min-h-[60vh]" />
      </LocaleProvider>
    </Suspense>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LandingFallback />}>
      <LocaleProvider>
        <LandingContent />
      </LocaleProvider>
    </Suspense>
  );
}

async function LandingContent() {
  await connection();
  const snapshot = await getMarketingLandingSnapshot();
  return <MarketingLanding snapshot={snapshot} />;
}
