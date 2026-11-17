# Payments (Stripe)

Money comes in when students buy class packages and goes out when teachers
are paid. Both run on Stripe; without `STRIPE_SECRET_KEY` checkout stays a
demo purchase and payouts are recorded by hand.

The app runs in **sandbox (test mode)** by default: a live key (`sk_live_`)
is ignored unless `STRIPE_ALLOW_LIVE=true`.

## Receiving: package checkout

1. The student presses **Pay** on `/checkout`. The server creates a `pending`
   order and a Stripe Checkout Session (`src/server/payments/checkout.ts`).
2. The student pays on Stripe's page; the academy never sees card data.
3. Stripe calls `POST /api/webhooks/stripe` (`checkout.session.completed`).
   The order becomes `paid` and the credits are added in one statement, only
   once (a repeated webhook changes nothing). The amount must match the order
   or it is refused and logged as critical.
4. Stripe returns the student to `/checkout/complete`, which also confirms the
   payment if the webhook has not arrived yet.

Canceled or expired checkouts leave the order `canceled`; no credits move.

## Sending: teacher payouts (Stripe Connect)

1. Each teacher presses **Connect Stripe** on `/teacher/earnings` once. The
   app creates a Stripe Express account (`STRIPE_CONNECT_COUNTRY`, default US)
   and Stripe collects identity and bank details. `account.updated` marks the
   teacher ready.
2. A manager prepares the monthly batch and the admin approves it, as before.
3. The admin presses **Pay with Stripe**: one transfer per teacher from the
   academy's Stripe balance (`src/server/payments/connect.ts`). Each transfer
   is idempotent per batch and teacher, so a retry never pays twice. The batch
   is marked paid when every teacher was paid. If a teacher has not finished
   Stripe setup, nothing is sent and the admin sees who is missing.
4. **Mark as paid** is still there for money sent outside Stripe.

## Sandbox setup

1. In the Stripe dashboard switch to **Test mode** and copy the secret key
   (`sk_test_…`) into `.env` as `STRIPE_SECRET_KEY`.
2. Webhook: run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   (Stripe CLI) and copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`.
   For a deployed site, add the endpoint in Developers → Webhooks with the
   events `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.expired` and `account.updated` (including events on
   connected accounts).
3. Enable **Connect** in the dashboard (Express accounts).
4. Restart the server and run `pnpm db:migrate` (migration `0005`).

Test data:

- Card `4242 4242 4242 4242`, any future date, any CVC: payment succeeds.
- Card `4000 0000 0000 0077`: the money is available at once, which test
  transfers need (normal test payments stay "pending" for a few days).
- Teacher onboarding: Stripe's test values (phone code `000 000`, test bank
  account and routing numbers shown in the form).

## Going live

Stripe accounts can only be opened by businesses in
[supported countries](https://stripe.com/global). Before live keys:

- Confirm the country of the academy's Stripe account and that Connect payouts
  reach the teachers' countries (cross-border payouts or Global Payouts).
- Set `STRIPE_ALLOW_LIVE=true`, the live key, a live webhook secret, and
  `STRIPE_CONNECT_COUNTRY` as agreed with Stripe.
