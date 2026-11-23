import { timingSafeEqual } from "node:crypto";
import { env } from "@/env";
import { reconcilePendingPayments } from "@/server/payments/reconcile";

/**
 * Settles Stripe payments that stayed "pending" (missed webhook, closed tab):
 * paid ones get their credits, expired ones are canceled. Call it every hour
 * from a scheduler with the header `Authorization: Bearer <CRON_SECRET>`
 * (Vercel Cron sends it by itself when CRON_SECRET is set).
 */

function authorized(request: Request) {
  if (!env.CRON_SECRET) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!env.CRON_SECRET) return new Response("CRON_SECRET is not set", { status: 503 });
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  // A Checkout page lasts 60 minutes: leave newer ones to the student.
  const summary = await reconcilePendingPayments({ olderThanMinutes: 65, limit: 100 });
  return Response.json(summary);
}
