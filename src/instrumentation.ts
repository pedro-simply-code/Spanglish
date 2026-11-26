import * as Sentry from "@sentry/nextjs";

const PRIVATE: NonNullable<Parameters<typeof Sentry.init>[0]>["dataCollection"] = {
  userInfo: false,
  cookies: false,
  httpBodies: [],
  urlQueryParams: false,
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  stackFrameVariables: false,
};

/*
 * Error monitoring with Sentry (free plan is enough). Off until SENTRY_DSN is
 * set; then server errors (Claude, Stripe, LiveKit, email…) and failed
 * requests are reported, with alerts configured in Sentry.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    // No user info, cookies, bodies, AI prompts or query values: students' data stays here.
    dataCollection: PRIVATE,
  });
}

export const onRequestError: typeof Sentry.captureRequestError = (...args) => {
  if (!process.env.SENTRY_DSN) return;
  return Sentry.captureRequestError(...args);
};
