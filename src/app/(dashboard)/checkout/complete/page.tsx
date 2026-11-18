import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { CheckoutResult } from "@/features/academy";
import { requireDashboard } from "@/server/auth/session";
import { fulfillFromReturn } from "@/server/payments/checkout";
import { stripeEnabled } from "@/server/payments/stripe";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student");
  return {
    title: t("meta.payment.title"),
    description: t("meta.payment.description"),
  };
}

type Props = { searchParams: Promise<{ session_id?: string }> };

export default function CheckoutCompletePage({ searchParams }: Props) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Result searchParams={searchParams} />
    </Suspense>
  );
}

async function Result({ searchParams }: Props) {
  const actor = await requireDashboard("student");
  const { session_id: sessionId } = await searchParams;
  if (!stripeEnabled || !sessionId) return <CheckoutResult state="failed" />;

  // The webhook usually got here first; this makes the page right either way.
  const result = await fulfillFromReturn(actor, sessionId).catch(() => ({ status: "not-found" as const }));
  if (result.status === "paid" || result.status === "already-paid") {
    return <CheckoutResult state="paid" credits={result.credits} />;
  }
  return <CheckoutResult state={result.status === "unpaid" ? "processing" : "failed"} />;
}
