import Stripe from "stripe";
import { env } from "@/env";

/*
 * Stripe client. Sandbox only unless STRIPE_ALLOW_LIVE=true: a live key
 * (sk_live_) is ignored otherwise, so a copied production key cannot charge
 * real cards from a dev machine. Created lazily (never at build time).
 */

const key = env.STRIPE_SECRET_KEY;
const isLiveKey = Boolean(key?.startsWith("sk_live_"));

export const stripeEnabled = Boolean(key) && (!isLiveKey || env.STRIPE_ALLOW_LIVE);
export const stripeTestMode = stripeEnabled && !isLiveKey;
export const stripeWebhookEnabled = stripeEnabled && Boolean(env.STRIPE_WEBHOOK_SECRET);

if (key && isLiveKey && !env.STRIPE_ALLOW_LIVE) {
  console.warn("[stripe] A live key is set but STRIPE_ALLOW_LIVE is not true: Stripe stays off.");
}

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!stripeEnabled || !key) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY).");
  client ??= new Stripe(key, { appInfo: { name: "Spanglish Academy" } });
  return client;
}

/** Stripe amounts are in the smallest unit; the academy sells in USD. */
export const STRIPE_CURRENCY = "usd";

export function stripeErrorMessage(error: unknown) {
  if (error instanceof Stripe.errors.StripeError) return error.message;
  return error instanceof Error ? error.message : "Unknown Stripe error";
}
