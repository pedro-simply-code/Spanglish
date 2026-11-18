import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { CreditsOverview } from "@/features/credits";
import { resolveTimeZone } from "@/lib/timezone";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { listBalancesForStudent, listCreditHistoryForStudent } from "@/server/credits/credits";
import { listOrdersForStudent } from "@/server/credits/orders";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.learn.credits");
  return { title: t("title"), description: t("subtitle") };
}

export default function CreditsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <CreditsContent />
    </Suspense>
  );
}

async function CreditsContent() {
  const actor = await requireDashboard("student");
  const [balances, history, orders, profile] = await Promise.all([
    listBalancesForStudent(actor.userId),
    listCreditHistoryForStudent(actor.userId, 500),
    listOrdersForStudent(actor.userId),
    getUserProfile(actor.userId),
  ]);
  return (
    <CreditsOverview
      balances={balances.map((item) => ({
        classType: item.classType,
        durationMinutes: item.durationMinutes,
        balance: item.balance,
        shared: item.shared,
      }))}
      history={history}
      orders={orders}
      timeZone={resolveTimeZone(profile?.timezone)}
    />
  );
}
