import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/** B2 often shows a host without a scheme; Zod requires a full URL. */
const optionalHttpsUrl = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}, z.string().url().optional());

/**
 * Environment contract for Spanglish.
 *
 * Variables that are optional today are still validated when present. The
 * optional ones become required as soon as the related integration is wired:
 * email delivery (Gmail SMTP or Postmark), Google OAuth, LiveKit, and Backblaze B2.
 * `BETTER_AUTH_SECRET` (sessions, 2FA secrets) and `AUTH_SECRET` (classroom
 * and guest-link tokens) must be set in production; the code refuses to fall
 * back to the development secrets outside development.
 *
 * Booleans use `z.stringbool()`: "true"/"1"/"yes"/"on" are true and
 * "false"/"0"/"no"/"off" are false. (`z.coerce.boolean()` would turn the
 * string "false" into `true`.)
 */
export const env = createEnv({
  /**
   * Server-side environment variables. Not available on the client.
   */
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Database
    DATABASE_URL: z.string().url(),

    // Authentication
    /** Better Auth: signs sessions and encrypts 2FA secrets. */
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    /** Signs classroom meeting tokens and guest join links. */
    AUTH_SECRET: z.string().min(32).optional(),
    AUTH_DASHBOARD_COOKIE: z.string().min(1).default("spanglish_dashboard"),
    /** The academy owner: becomes the only admin on its first verified sign-in. */
    ADMIN_EMAIL: z.email().optional(),

    // Email (verification codes and class notifications)
    EMAIL_PROVIDER: z.enum(["gmail_smtp", "postmark"]).default("gmail_smtp"),
    EMAIL_FROM: z.string().min(1).optional(),
    EMAIL_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(10),
    SMTP_HOST: z.string().min(1).default("smtp.gmail.com"),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    POSTMARK_SERVER_TOKEN: z.string().min(1).optional(),
    POSTMARK_MESSAGE_STREAM: z.string().min(1).default("outbound"),

    // Google OAuth
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    /** Android OAuth client: native Google sign-in sends ID tokens for it. */
    GOOGLE_ANDROID_CLIENT_ID: z.string().min(1).optional(),

    // Cloudflare Turnstile (sign-up, email codes, password reset)
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),

    /** Basic-auth password Postmark sends on bounce webhooks. */
    POSTMARK_WEBHOOK_SECRET: z.string().min(16).optional(),

    // Live classes: LiveKit (https://livekit.com)
    MEETING_PROVIDER: z
      .enum(["livekit", "zoom", "google-meet", "custom"])
      .default("livekit"),
    LIVEKIT_URL: z.string().url().optional(),
    LIVEKIT_API_KEY: z.string().min(1).optional(),
    LIVEKIT_API_SECRET: z.string().min(1).optional(),
    MEETING_TOKEN_TTL_MINUTES: z.coerce
      .number()
      .int()
      .positive()
      .default(60),
    /** When true, students wait for teacher approval before receiving a LiveKit token. */
    CLASS_WAITING_ROOM: z.stringbool().default(false),
    /** When true, only the assigned teacher can start the call; students join after start. */
    CLASS_TEACHER_STARTS_SESSION: z.stringbool().default(true),
    /** RTMP ingest URL for LiveKit egress (e.g. YouTube Live). */
    LIVEKIT_RTMP_URL: z.string().url().optional(),
    /**
     * Name the classroom agent registers with (agent/classroom-agent.ts). When set,
     * every class room asks LiveKit to send that agent in to transcribe it.
     */
    CLASSROOM_AGENT_NAME: z.string().min(1).max(60).optional(),
    /** Shared secret the agent sends to /api/agent/transcript (32+ characters). */
    CLASSROOM_AGENT_SECRET: z.string().min(32).optional(),
    /** Claude writes a summary of each class from its transcript when it ends. */
    LESSON_SUMMARY_ENABLED: z.stringbool().default(true),

    // Recordings: Backblaze B2 (https://www.backblaze.com/b2/cloud-storage.html)
    B2_KEY_ID: z.string().min(1).optional(),
    B2_APPLICATION_KEY: z.string().min(1).optional(),
    B2_BUCKET_NAME: z.string().min(1).optional(),
    B2_S3_ENDPOINT: optionalHttpsUrl,
    B2_REGION: z.string().min(1).default("us-west-004"),
    /** Class recordings: `local` (disk + browser download) or `cloud` (Backblaze B2). */
    /** Unset: "cloud" when the B2_* variables are set, otherwise "local". */
    RECORDING_STORAGE: z.enum(["local", "cloud"]).optional(),

    // Stripe: package checkout (receive) and Connect transfers to teachers (send).
    STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
    /** Live keys (sk_live_) are refused unless this is true: sandbox by default. */
    STRIPE_ALLOW_LIVE: z.stringbool().default(false),
    /** Country of new teacher Connect accounts (two letters). */
    STRIPE_CONNECT_COUNTRY: z.string().length(2).default("US"),
    /** Shown to teachers: typical review + bank settlement time after a payout is sent. */
    PAYOUT_PROCESSING_BUSINESS_DAYS: z.coerce.number().int().positive().max(30).default(5),

    // AI conversation practice (Anthropic Claude)
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    /** Cheapest current Claude model by default; change without a deploy of code. */
    ANTHROPIC_MODEL: z.string().min(1).default("claude-haiku-5-5"),
    /** Total tokens (input + output, scene included) one practice conversation may use. */
    AI_CONVERSATION_TOKEN_LIMIT: z.coerce.number().int().min(2000).max(200000).default(10000),
    /** USD per million tokens for ANTHROPIC_MODEL; used to show the cost of each conversation. */
    AI_PRICE_INPUT_PER_MTOK: z.coerce.number().min(0).default(0.1),
    AI_PRICE_OUTPUT_PER_MTOK: z.coerce.number().min(0).default(0.5),
    /** Optional safety cap on new practice conversations per day and mode (0 = no cap; free and paid both count). */
    AI_CONVERSATIONS_PER_DAY: z.coerce.number().int().min(0).max(100).default(0),
    /** Free conversations per attended class, for each practice (Luna and chat). */
    AI_FREE_CONVERSATIONS_PER_CLASS: z.coerce.number().int().min(0).max(20).default(2),
    /** AI credit packs: conservative model price (USD per million tokens, input and output mixed). */
    AI_CREDIT_USD_PER_MTOK: z.coerce.number().positive().max(100).default(0.3),
    /** AI credit packs: each conversation is priced at this many times its model cost. */
    AI_CREDIT_COST_MULTIPLIER: z.coerce.number().min(1).max(20).default(2),
    /** Card fee taken by the payment provider, used to price AI credit packs. */
    PAYMENT_FEE_PERCENT: z.coerce.number().min(0).max(20).default(2.9),
    PAYMENT_FEE_FIXED_CENTS: z.coerce.number().int().min(0).max(500).default(30),
    /** Protects /api/cron/* (scheduled jobs send `Authorization: Bearer <CRON_SECRET>`). */
    CRON_SECRET: z.string().min(16).optional(),

    // Live classes: student policy
    CLASS_CANCEL_CUTOFF_HOURS: z.coerce.number().int().positive().default(24),
    CLASS_RESCHEDULE_CUTOFF_HOURS: z.coerce
      .number()
      .int()
      .positive()
      .default(24),
    CLASS_JOIN_WINDOW_BEFORE_MINUTES: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(15),
    CLASS_JOIN_WINDOW_AFTER_MINUTES: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(15),
    // Testing only: allow joining the classroom before the usual pre-start window.
    CLASS_RELAX_JOIN_WINDOW: z.stringbool().default(false),
    /**
     * Shows the seeded demo accounts on the login page outside development
     * (for example on a staging deploy). Never enable on the public site.
     */
    ENABLE_DEMO_ACCOUNTS: z.stringbool().default(false),
  },

  /**
   * Environment variables exposed to the client (`NEXT_PUBLIC_` prefix).
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_LIVEKIT_URL: z.string().url().optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  },

  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DASHBOARD_COOKIE: process.env.AUTH_DASHBOARD_COOKIE,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_CODE_TTL_MINUTES: process.env.EMAIL_CODE_TTL_MINUTES,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
    POSTMARK_MESSAGE_STREAM: process.env.POSTMARK_MESSAGE_STREAM,
    // Also accepts the Auth.js names (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET) and
    // GOOGLE_ID / GOOGLE_SECRET, so a copied .env still turns the button on.
    GOOGLE_CLIENT_ID:
      process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_ID,
    GOOGLE_CLIENT_SECRET:
      process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_SECRET,
    GOOGLE_ANDROID_CLIENT_ID: process.env.GOOGLE_ANDROID_CLIENT_ID,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    POSTMARK_WEBHOOK_SECRET: process.env.POSTMARK_WEBHOOK_SECRET,
    MEETING_PROVIDER: process.env.MEETING_PROVIDER,
    LIVEKIT_URL: process.env.LIVEKIT_URL,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
    MEETING_TOKEN_TTL_MINUTES: process.env.MEETING_TOKEN_TTL_MINUTES,
    CLASSROOM_AGENT_NAME: process.env.CLASSROOM_AGENT_NAME,
    CLASSROOM_AGENT_SECRET: process.env.CLASSROOM_AGENT_SECRET,
    LESSON_SUMMARY_ENABLED: process.env.LESSON_SUMMARY_ENABLED,
    CLASS_WAITING_ROOM: process.env.CLASS_WAITING_ROOM,
    CLASS_TEACHER_STARTS_SESSION: process.env.CLASS_TEACHER_STARTS_SESSION,
    LIVEKIT_RTMP_URL: process.env.LIVEKIT_RTMP_URL,
    B2_KEY_ID: process.env.B2_KEY_ID,
    B2_APPLICATION_KEY: process.env.B2_APPLICATION_KEY,
    B2_BUCKET_NAME: process.env.B2_BUCKET_NAME,
    B2_S3_ENDPOINT: process.env.B2_S3_ENDPOINT,
    B2_REGION: process.env.B2_REGION,
    RECORDING_STORAGE: process.env.RECORDING_STORAGE,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_ALLOW_LIVE: process.env.STRIPE_ALLOW_LIVE,
    STRIPE_CONNECT_COUNTRY: process.env.STRIPE_CONNECT_COUNTRY,
    PAYOUT_PROCESSING_BUSINESS_DAYS: process.env.PAYOUT_PROCESSING_BUSINESS_DAYS,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
    AI_CONVERSATION_TOKEN_LIMIT: process.env.AI_CONVERSATION_TOKEN_LIMIT,
    AI_CONVERSATIONS_PER_DAY: process.env.AI_CONVERSATIONS_PER_DAY,
    AI_FREE_CONVERSATIONS_PER_CLASS: process.env.AI_FREE_CONVERSATIONS_PER_CLASS,
    AI_CREDIT_USD_PER_MTOK: process.env.AI_CREDIT_USD_PER_MTOK,
    AI_CREDIT_COST_MULTIPLIER: process.env.AI_CREDIT_COST_MULTIPLIER,
    PAYMENT_FEE_PERCENT: process.env.PAYMENT_FEE_PERCENT,
    PAYMENT_FEE_FIXED_CENTS: process.env.PAYMENT_FEE_FIXED_CENTS,
    CRON_SECRET: process.env.CRON_SECRET,
    AI_PRICE_INPUT_PER_MTOK: process.env.AI_PRICE_INPUT_PER_MTOK,
    AI_PRICE_OUTPUT_PER_MTOK: process.env.AI_PRICE_OUTPUT_PER_MTOK,
    CLASS_CANCEL_CUTOFF_HOURS: process.env.CLASS_CANCEL_CUTOFF_HOURS,
    CLASS_RESCHEDULE_CUTOFF_HOURS: process.env.CLASS_RESCHEDULE_CUTOFF_HOURS,
    CLASS_JOIN_WINDOW_BEFORE_MINUTES:
      process.env.CLASS_JOIN_WINDOW_BEFORE_MINUTES,
    CLASS_JOIN_WINDOW_AFTER_MINUTES:
      process.env.CLASS_JOIN_WINDOW_AFTER_MINUTES,
    CLASS_RELAX_JOIN_WINDOW: process.env.CLASS_RELAX_JOIN_WINDOW,
    ENABLE_DEMO_ACCOUNTS: process.env.ENABLE_DEMO_ACCOUNTS,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});