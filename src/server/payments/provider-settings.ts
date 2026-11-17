import { and, eq, gte, sql } from "drizzle-orm";
import type { PaymentProvider } from "@/features/admin";
import { env } from "@/env";
import { recordAuditEvent } from "@/server/audit/audit-log";
import type { AuthSession } from "@/lib/auth-types";
import { db } from "@/server/db";
import { orders, paymentProviderSettings, type OrderProvider } from "@/server/db/schema";
import { requestTime } from "@/server/request-time";
import { stripeEnabled, stripeTestMode, stripeWebhookEnabled } from "@/server/payments/stripe";

export type PaymentProviderSettings = {
  stripeCheckoutEnabled: boolean;
  stripePayoutEnabled: boolean;
  manualPayoutEnabled: boolean;
};

const defaults: PaymentProviderSettings = {
  stripeCheckoutEnabled: true,
  stripePayoutEnabled: true,
  manualPayoutEnabled: true,
};

export async function getPaymentProviderSettings(): Promise<PaymentProviderSettings> {
  const [row] = await db
    .select()
    .from(paymentProviderSettings)
    .where(eq(paymentProviderSettings.id, "default"))
    .limit(1);
  if (!row) return defaults;
  return {
    stripeCheckoutEnabled: row.stripeCheckoutEnabled,
    stripePayoutEnabled: row.stripePayoutEnabled,
    manualPayoutEnabled: row.manualPayoutEnabled,
  };
}

export function checkoutUsesStripe(settings: PaymentProviderSettings = defaults) {
  return stripeEnabled && settings.stripeCheckoutEnabled;
}

export function payoutUsesStripeConnect(settings: PaymentProviderSettings = defaults) {
  return stripeEnabled && settings.stripePayoutEnabled;
}

export function manualPayoutAllowed(settings: PaymentProviderSettings = defaults) {
  return settings.manualPayoutEnabled;
}

export async function savePaymentProviderSettings(actor: AuthSession, input: PaymentProviderSettings) {
  const values = {
    stripeCheckoutEnabled: Boolean(input.stripeCheckoutEnabled),
    stripePayoutEnabled: Boolean(input.stripePayoutEnabled),
    manualPayoutEnabled: Boolean(input.manualPayoutEnabled),
  };
  if (!values.stripePayoutEnabled && !values.manualPayoutEnabled) {
    return { ok: false as const, message: "Keep at least one teacher payout method enabled." };
  }
  await db
    .insert(paymentProviderSettings)
    .values({
      id: "default",
      ...values,
      updatedByUserId: actor.userId,
    })
    .onConflictDoUpdate({
      target: paymentProviderSettings.id,
      set: { ...values, updatedByUserId: actor.userId, updatedAt: new Date() },
    });
  await recordAuditEvent({
    action: "payment.providers_changed",
    severity: "warning",
    actorUserId: actor.userId,
    targetType: "settings",
    targetId: "payment_providers",
    metadata: values,
  });
  return { ok: true as const, message: "Payment provider settings saved." };
}

const REVENUE_WINDOW_DAYS = 30;

function revenueWindowStart(days: number, now: Date) {
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - days);
  return since;
}

async function queryPaidRevenueByProviderSince(since: Date): Promise<Record<OrderProvider, number>> {
  const rows = await db
    .select({
      provider: orders.provider,
      total: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
    })
    .from(orders)
    .where(and(eq(orders.status, "paid"), gte(orders.createdAt, since)))
    .groupBy(orders.provider);
  const out: Record<OrderProvider, number> = { demo: 0, stripe: 0, manual: 0 };
  for (const row of rows) {
    out[row.provider] = row.total;
  }
  return out;
}

export async function paidRevenueByProvider(days = REVENUE_WINDOW_DAYS): Promise<Record<OrderProvider, number>> {
  await requestTime();
  return queryPaidRevenueByProviderSince(revenueWindowStart(days, new Date()));
}

function stripeCheckoutStatus(settings: PaymentProviderSettings): PaymentProvider["status"] {
  if (!settings.stripeCheckoutEnabled) return "disabled";
  if (!stripeEnabled) return envHasStripeKey() ? "setup-needed" : "not-configured";
  return stripeWebhookEnabled ? "connected" : "setup-needed";
}

function stripeConnectStatus(settings: PaymentProviderSettings): PaymentProvider["status"] {
  if (!settings.stripePayoutEnabled) return "disabled";
  if (!stripeEnabled) return envHasStripeKey() ? "setup-needed" : "not-configured";
  return "connected";
}

function manualTransferStatus(settings: PaymentProviderSettings): PaymentProvider["status"] {
  return settings.manualPayoutEnabled ? "connected" : "disabled";
}

function envHasStripeKey() {
  return Boolean(env.STRIPE_SECRET_KEY);
}

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export async function buildPaymentProviders(): Promise<{
  providers: PaymentProvider[];
  settings: PaymentProviderSettings;
  revenue: Record<OrderProvider, number>;
}> {
  // Caller must await requestTime() first (page Suspense boundary).
  const since = revenueWindowStart(REVENUE_WINDOW_DAYS, new Date());
  const [settings, revenue] = await Promise.all([
    getPaymentProviderSettings(),
    queryPaidRevenueByProviderSince(since),
  ]);
  const stripeRevenue = revenue.stripe;
  const demoRevenue = revenue.demo;

  const providers: PaymentProvider[] = [
    {
      id: "stripe-checkout",
      name: "Stripe Checkout",
      role: "Checkout",
      status: stripeCheckoutStatus(settings),
      enabled: settings.stripeCheckoutEnabled,
      envReady: stripeEnabled,
      canToggle: true,
      revenueLabel: stripeRevenue > 0 ? `${money(stripeRevenue)} last ${REVENUE_WINDOW_DAYS} days` : "No paid orders yet",
      note: stripeEnabled
        ? settings.stripeCheckoutEnabled
          ? stripeWebhookEnabled
            ? "Students pay on Stripe Checkout; credits apply when payment is confirmed."
            : "Stripe keys are set but STRIPE_WEBHOOK_SECRET is missing — webhooks must work in production."
          : "Turned off in admin — students use demo checkout until you re-enable Stripe."
        : "Add STRIPE_SECRET_KEY (and webhooks in production) under Platform → Integrations.",
    },
    {
      id: "stripe-connect",
      name: "Stripe Connect",
      role: "Teacher payouts",
      status: stripeConnectStatus(settings),
      enabled: settings.stripePayoutEnabled,
      envReady: stripeEnabled,
      canToggle: true,
      revenueLabel: "Payout rail",
      note: stripeEnabled
        ? settings.stripePayoutEnabled
          ? "Pay approved batches with in-app Stripe transfers to connected teacher accounts."
          : "Turned off — use international / bank transfers and Mark as paid."
        : "Configure Stripe to pay teachers through Connect.",
    },
    {
      id: "manual-transfer",
      name: "International & bank transfers",
      role: "Teacher payouts",
      status: manualTransferStatus(settings),
      enabled: settings.manualPayoutEnabled,
      envReady: true,
      canToggle: true,
      revenueLabel: "Off-platform",
      note:
        stripeRevenue > 0 && demoRevenue === 0
          ? "All recent student revenue went through Stripe — Connect is usually enough, but you can still pay teachers by Wise or wire."
          : "Record Wise, SWIFT, or other transfers with Mark as paid after approval.",
    },
  ];

  return { providers, settings, revenue };
}

export async function getCheckoutStripeUi() {
  const settings = await getPaymentProviderSettings();
  return {
    enabled: checkoutUsesStripe(settings),
    testMode: stripeTestMode,
    demoFallback: !checkoutUsesStripe(settings),
  };
}

export async function getPayoutRailsUi() {
  const settings = await getPaymentProviderSettings();
  return {
    enabled: payoutUsesStripeConnect(settings),
    manualTransferEnabled: manualPayoutAllowed(settings),
    testMode: stripeTestMode,
  };
}