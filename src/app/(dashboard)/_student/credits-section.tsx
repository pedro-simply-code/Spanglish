import { CreditsOverview } from "@/features/credits";
import { resolveTimeZone } from "@/lib/timezone";
import { env } from "@/env";
import { getAiAllowance, listAiCreditHistory, listAiCreditOrders, listAiCreditPacks } from "@/server/ai/credits";
import { requireDashboard } from "@/server/auth/session";
import { reconcilePendingPayments } from "@/server/payments/reconcile";
import { getUserProfile } from "@/server/auth/user-repository";
import { listBalancesForStudent, listCreditHistoryForStudent } from "@/server/credits/credits";
import { listOrdersForStudent } from "@/server/credits/orders";
import { listPublishedAcademyPlans } from "@/server/pricing/packages";

export async function CreditsSection() {
  const actor = await requireDashboard("student");
  // Pending Stripe payments of this student: paid ones get their credits, expired ones close.
  await reconcilePendingPayments({ userId: actor.userId, limit: 5 }).catch(() => null);
  const [balances, history, orders, profile, allowance, aiHistory, aiOrders, plans, aiPacks] = await Promise.all([
    listBalancesForStudent(actor.userId),
    listCreditHistoryForStudent(actor.userId, 500),
    listOrdersForStudent(actor.userId),
    getUserProfile(actor.userId),
    getAiAllowance(actor.userId),
    listAiCreditHistory(actor.userId),
    listAiCreditOrders(actor.userId),
    listPublishedAcademyPlans(),
    listAiCreditPacks({ activeOnly: true }),
  ]);
  const planIds = new Set(plans.map((plan) => plan.id));
  const packIds = new Set(aiPacks.filter((pack) => pack.credits > 0).map((pack) => pack.id));
  // "Buy again": the same package straight to checkout; if it is no longer on
  // sale, the buy steps with its type, length and size preselected.
  const classesBuyAgain = (order: (typeof orders)[number]) =>
    order.packageId && planIds.has(order.packageId)
      ? `/checkout?plan=${encodeURIComponent(order.packageId)}`
      : `/credits?tab=buy&type=${order.classType}&duration=${order.durationMinutes}&classes=${order.credits}`;
  const aiBuyAgain = (packId: string | null) =>
    packId && packIds.has(packId)
      ? `/credits?tab=buy&product=ai&pack=${encodeURIComponent(packId)}&step=review`
      : "/credits?tab=buy&product=ai";
  return (
    <CreditsOverview
      balances={balances.map((item) => ({
        classType: item.classType,
        durationMinutes: item.durationMinutes,
        balance: item.balance,
        shared: item.shared,
      }))}
      history={history}
      orders={orders.map((order) => ({ ...order, buyAgainHref: classesBuyAgain(order) }))}
      timeZone={resolveTimeZone(profile?.timezone)}
      ai={{
        credits: allowance.credits,
        freeVoice: allowance.free.voice.left,
        freeChat: allowance.free.chat.left,
        perClass: allowance.perClass,
        tokensPerConversation: env.AI_CONVERSATION_TOKEN_LIMIT,
        history: aiHistory,
        orders: aiOrders.map((order) => ({ ...order, buyAgainHref: aiBuyAgain(order.packId) })),
      }}
    />
  );
}
