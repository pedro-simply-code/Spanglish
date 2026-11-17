import type { Metadata } from "next";
import { Suspense } from "react";
import Box from "@mui/material/Box";
import { connection } from "next/server";
import { MarketingPackagesSection, MarketingShell } from "@/features/marketing";
import { getMarketingLandingSnapshot } from "@/server/marketing/landing-snapshot";

export const metadata: Metadata = {
  title: "Packages & pricing",
  description:
    "Compare Spanglish Academy class packages — individual or paired, 25 or 50 minutes, native teachers from Guatemala.",
};

function PackagesFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center bg-[var(--background)] text-[var(--muted)]"
      aria-busy
    >
      Loading…
    </div>
  );
}

export default function PackagesPage() {
  return (
    <Suspense fallback={<PackagesFallback />}>
      <PackagesContent />
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