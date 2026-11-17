import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { MarketingLanding } from "@/features/marketing";
import { getMarketingLandingSnapshot } from "@/server/marketing/landing-snapshot";

export const metadata: Metadata = {
  title: "Learn Spanish with native teachers in Guatemala",
  description:
    "Spanglish Academy — live Spanish classes online with native teachers from Guatemala. Individual or paired sessions, flexible scheduling, and classroom recordings.",
};

function LandingFallback() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center bg-[var(--background)] text-[var(--muted)]"
      aria-busy
    >
      Loading…
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LandingFallback />}>
      <LandingContent />
    </Suspense>
  );
}

async function LandingContent() {
  await connection();
  const snapshot = await getMarketingLandingSnapshot();
  return <MarketingLanding snapshot={snapshot} />;
}