import type Stripe from "stripe";
import { env } from "@/env";
import { cancelAiStripeOrder, fulfillAiStripeOrder } from "@/server/ai/credits";
import { cancelStripeOrder, fulfillStripeOrder } from "@/server/payments/checkout";
import { syncConnectedAccount } from "@/server/payments/connect";
import { stripe, stripeEnabled } from "@/server/payments/stripe";

/**
 * Stripe webhooks. In the Stripe dashboard (Developers → Webhooks, test mode)
 * add an endpoint https://<your-domain>/api/webhooks/stripe with the events
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.async_payment_failed, checkout.session.expired, account.updated
 * ("Listen to events on Connected accounts" too, for account.updated) and put
 * its signing secret in STRIPE_WEBHOOK_SECRET. Locally:
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */
export async function POST(request: Request) {
  if (!stripeEnabled || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe is not configured", { status: 503 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      body,
      request.headers.get("stripe-signature") ?? "",
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      // AI credit packs (metadata.kind = "ai") have their own orders table.
      if (session.metadata?.kind === "ai") {
        await fulfillAiStripeOrder({
          sessionId: session.id,
          orderId: session.client_reference_id,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
        });
        break;
      }
      await fulfillStripeOrder({
        sessionId: session.id,
        orderId: session.client_reference_id,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      });
      break;
    }
    // A bank payment that failed after checkout: the order will never be paid.
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object;
      if (session.metadata?.kind === "ai") await cancelAiStripeOrder(session.id, session.client_reference_id);
      else await cancelStripeOrder(session.id, session.client_reference_id);
      break;
    }
    case "account.updated": {
      await syncConnectedAccount(event.data.object);
      break;
    }
    default:
      break;
  }

  return Response.json({ received: true });
}
