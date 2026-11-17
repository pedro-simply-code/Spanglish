import { getActivePairForUser } from "@/server/classes/pairs";
import { listBalancesForStudent, listCreditHistoryForStudent } from "@/server/credits/credits";
import { json, requireApiActor } from "@/server/api/http";

/** GET /api/v1/credits — balances (own and shared with a partner) and recent movements. */
export async function GET() {
  const guard = await requireApiActor({ permission: "classes:book" });
  if (guard.response) return guard.response;

  const [balances, history, pair] = await Promise.all([
    listBalancesForStudent(guard.actor.userId),
    listCreditHistoryForStudent(guard.actor.userId, 30),
    getActivePairForUser(guard.actor.userId),
  ]);

  return json({
    partner: pair ? { name: pair.partnerName } : null,
    balances: balances.map((item) => ({
      classType: item.classType,
      durationMinutes: item.durationMinutes,
      balance: item.balance,
      shared: item.shared,
    })),
    history,
  });
}
