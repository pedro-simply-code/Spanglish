import { PricingOverview } from "@/features/academy";
import { getActor } from "@/server/auth/session";
import { env } from "@/env";
import { getAiAllowance, listAiCreditPacks } from "@/server/ai/credits";
import { listBalancesForStudent } from "@/server/credits/credits";
import { listPublishedAcademyPlans } from "@/server/pricing/packages";

/** Classes and AI credits on sale. Staff see the same page (from /pricing) without their own balances. */
export async function BuySection() {
  const actor = await getActor();
  const student = actor.activeRole === "student";
  const [plans, aiPacks, balances, allowance] = await Promise.all([
    listPublishedAcademyPlans(),
    listAiCreditPacks({ activeOnly: true }),
    student ? listBalancesForStudent(actor.userId) : Promise.resolve([]),
    student ? getAiAllowance(actor.userId) : Promise.resolve(null),
  ]);
  return (
    <PricingOverview
      plans={plans}
      creditsLeft={balances.reduce((sum, item) => sum + item.balance, 0)}
      aiPacks={aiPacks
        .filter((pack) => pack.credits > 0)
        .map(({ id, name, credits, priceCents }) => ({ id, name, credits, priceCents }))}
      tokensPerConversation={env.AI_CONVERSATION_TOKEN_LIMIT}
      aiAllowance={
        allowance
          ? {
              credits: allowance.credits,
              freeVoice: allowance.free.voice.left,
              freeChat: allowance.free.chat.left,
              perClass: allowance.perClass,
            }
          : null
      }
    />
  );
}
