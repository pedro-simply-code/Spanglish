import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import Box from "@mui/material/Box";
import { StripeConnectCard, TeacherEarnings, TeacherRequestPayoutCard } from "@/features/payouts";
import {
  localizedTeacherBadges,
  localizedTeacherLevelName,
  nextLevelGap,
  teacherLevelFor,
} from "@/lib/teacher-levels";
import { requireDashboard } from "@/server/auth/session";
import {
  getPayoutSettings,
  getTeacherPayoutRequestSummary,
  listEarningsForTeacher,
  startOfMonth,
} from "@/server/teaching/earnings";
import { platformTakePercentForLevel, teacherSharePercent } from "@/lib/teacher-pay";
import { getTeacherStats } from "@/server/teaching/stats";
import { getTeacherStripeStatus } from "@/server/payments/connect";
import { payoutProcessingWindowPhrase } from "@/server/teaching/payout-policy";
import {
  getPaymentProviderSettings,
  manualPayoutAllowed,
  payoutUsesStripeConnect,
} from "@/server/payments/provider-settings";
import { stripeEnabled, stripeTestMode } from "@/server/payments/stripe";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("educator.metadata.earnings");
  return { title: t("title"), description: t("description") };
}

export default function TeacherEarningsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const t = await getTranslations("educator");
  const actor = await requireDashboard("teacher");
  const providerSettings = await getPaymentProviderSettings();
  const [earnings, rates, stats, stripeStatus, payoutRequest] = await Promise.all([
    listEarningsForTeacher(actor.userId),
    getPayoutSettings(),
    getTeacherStats([actor.userId]),
    stripeEnabled && payoutUsesStripeConnect(providerSettings)
      ? getTeacherStripeStatus(actor.userId)
      : Promise.resolve(null),
    getTeacherPayoutRequestSummary(actor.userId),
  ]);
  const mine = stats.get(actor.userId)!;
  const level = teacherLevelFor(mine);
  const gap = nextLevelGap(mine);
  const platformTake = platformTakePercentForLevel(rates, level.level);
  const share = teacherSharePercent(platformTake);

  return (
    <>
      <TeacherEarnings
        earnings={earnings}
        levelName={localizedTeacherLevelName(level.level, t)}
        teacherSharePercent={share}
        platformTakePercent={platformTake}
        nextLevel={
          gap
            ? {
                name: localizedTeacherLevelName(gap.level.level, t),
                classes: gap.classes,
                ratings: gap.ratings,
                rating: gap.rating,
              }
            : null
        }
        ratingAverage={mine.ratingAverage}
        ratingCount={mine.ratingCount}
        classesTaught={mine.classesTaught}
        badges={localizedTeacherBadges(mine, t)}
        exampleCreditCents={2_000}
        monthStart={startOfMonth().toISOString()}
      />
      <Box mt={3}>
        <TeacherRequestPayoutCard
          unpaidCents={payoutRequest.unpaidCents}
          unpaidClasses={payoutRequest.unpaidClasses}
          stripeReady={stripeStatus?.ready ?? payoutRequest.stripeReady}
          payoutViaStripe={payoutUsesStripeConnect(providerSettings)}
          manualPayoutEnabled={manualPayoutAllowed(providerSettings)}
          minRequestCents={payoutRequest.minRequestCents}
          pendingBatch={payoutRequest.pendingBatch}
          processingWindow={payoutProcessingWindowPhrase(undefined, {
            one: t("payouts.processingDayOne"),
            other: t("payouts.processingDays", { days: "{days}" }),
          })}
        />
      </Box>
      {stripeStatus ? (
        <Box mt={3}>
          <StripeConnectCard
            connected={stripeStatus.connected}
            ready={stripeStatus.ready}
            testMode={stripeTestMode}
          />
        </Box>
      ) : null}
    </>
  );
}
