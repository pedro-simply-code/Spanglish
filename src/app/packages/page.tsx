import type { Metadata } from "next";
import { Suspense } from "react";
import Box from "@mui/material/Box";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { MarketingLoading, MarketingPackagesSection, MarketingShell } from "@/features/marketing";
import { LocaleProvider } from "@/i18n/locale-provider";
import { getMarketingLandingSnapshot } from "@/server/marketing/landing-snapshot";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return {
    title: t("metadata.packagesTitle"),
    description: t("metadata.packagesDescription"),
  };
}

function PackagesFallback() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-[40vh] items-center justify-center bg-[var(--background)]"
          aria-busy
        />
      }
    >
      <LocaleProvider>
        <MarketingLoading minHeight="min-h-[40vh]" />
      </LocaleProvider>
    </Suspense>
  );
}

export default function PackagesPage() {
  return (
    <Suspense fallback={<PackagesFallback />}>
      <LocaleProvider>
        <PackagesContent />
      </LocaleProvider>
    </Suspense>
  );
}

async function PackagesContent() {
  await connection();
  const snapshot = await getMarketingLandingSnapshot();

  return (
    <MarketingShell>
      <Box component="main" pt={{ xs: 2, md: 4 }}>
        <MarketingPackagesSection
          publishedPlans={snapshot.publishedPlans}
          showCheckoutActions
          sectionId="top"
        />
      </Box>
    </MarketingShell>
  );
}
