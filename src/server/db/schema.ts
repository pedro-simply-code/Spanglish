import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { RoleCode } from "@/lib/auth-roles";

/*
 * Authentication tables are owned by Better Auth (src/server/auth/auth.ts).
 * Property names must match Better Auth's field names (camelCase); the SQL
 * column names stay snake_case. Keep `additionalFields` in auth.ts and the
 * extra columns below in sync.
 */

export type ProfileLocale = "en" | "es";
export type LearningLanguage = "spanish" | "english";
export type LearningLevel = "beginner" | "intermediate" | "advanced";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Two-factor plugin.
    twoFactorEnabled: boolean("two_factor_enabled").default(false),
    // Spanglish fields (Better Auth `additionalFields`, never client input).
    roles: text("roles")
      .array()
      .$type<RoleCode[]>()
      .notNull()
      .default(sql`ARRAY['student']::text[]`),
    locale: text("locale").$type<ProfileLocale>().notNull().default("en"),
    timezone: text("timezone"),
    learningLanguage: text("learning_language").$type<LearningLanguage>(),
    level: text("level").$type<LearningLevel>(),
    goal: text("goal"),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    termsVersion: text("terms_version"),
    profileCompletedAt: timestamp("profile_completed_at", { withTimezone: true }),
    /** Set by the Postmark bounce webhook; security notices skip it. */
    emailBouncedAt: timestamp("email_bounced_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    // At most one admin: every admin row maps to the same key (true).
    uniqueIndex("users_single_admin_idx")
      .on(sql`(true)`)
      .where(sql`'admin' = ANY(${table.roles})`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /**
     * True while an account with 2FA signed in with an email code or Google
     * and has not entered its authenticator code yet. Such a session cannot
     * reach the app (see src/server/auth/session.ts and the auth hooks).
     */
    twoFactorPending: boolean("two_factor_pending").notNull().default(false),
  },
  (table) => [
    uniqueIndex("sessions_token_idx").on(table.token),
    index("sessions_user_idx").on(table.userId),
  ],
);

/** Sign-in methods per user: "credential" (password) and social providers. */
export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("accounts_user_idx").on(table.userId)],
);

/** One-time values: email codes, two-factor challenges, trusted devices. */
export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

/** Authenticator (TOTP) secrets and backup codes, encrypted by Better Auth. */
export const twoFactors = pgTable(
  "two_factors",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (table) => [
    index("two_factors_secret_idx").on(table.secret),
    index("two_factors_user_idx").on(table.userId),
  ],
);

/** Better Auth per-IP rate limiting (storage: "database"). */
export const rateLimits = pgTable("rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/**
 * Per-email auth rate limits that complement Better Auth's per-IP limits.
 * `key` combines the action and the subject, e.g. `sign-in:email:ana@x.com`.
 */
export const authRateLimits = pgTable("auth_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AuditSeverity = "info" | "warning" | "critical";

/** Security and account events (sign-ins, password and 2FA changes, …). */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    /** Who did it; null for anonymous events (e.g. a rate-limited attempt). */
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    severity: text("severity").$type<AuditSeverity>().notNull().default("info"),
    targetType: text("target_type"),
    targetId: text("target_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_created_idx").on(table.createdAt),
    index("audit_logs_actor_idx").on(table.actorUserId, table.createdAt),
  ],
);

export type ClassType = "one-on-one" | "paired";
export type ClassBillingKind = "standard" | "trial";
export type ClassSessionStatus = "scheduled" | "canceled";

export type ClassSessionMaterial = { title: string; description: string; href: string };

export type ClassCancellation = {
  by: "student" | "teacher" | "staff";
  byUserId: string | null;
  reason: string;
  at: string;
  creditRefunded: boolean;
};

/**
 * Two students who share paired classes and one credit pool. A student is in
 * at most one active pair (enforced in `src/server/classes/pairs.ts`).
 */
export const studentPairs = pgTable(
  "student_pairs",
  {
    id: text("id").primaryKey(),
    studentAId: text("student_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentBId: text("student_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    active: boolean("active").notNull().default(true),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("student_pairs_a_active_idx").on(table.studentAId).where(sql`${table.active}`),
    uniqueIndex("student_pairs_b_active_idx").on(table.studentBId).where(sql`${table.active}`),
    check("student_pairs_distinct", sql`${table.studentAId} <> ${table.studentBId}`),
  ],
);

/**
 * Class credits per holder and class kind. One-on-one credits belong to a
 * student (`user:<id>`); paired credits belong to the pair (`pair:<id>`).
 * `balance` never goes below zero, so a booking can only spend what exists.
 */
export const creditAccounts = pgTable(
  "credit_accounts",
  {
    id: text("id").primaryKey(),
    holder: text("holder").notNull(),
    classType: text("class_type").$type<ClassType>().notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    balance: integer("balance").notNull().default(0),
    /** Weighted average purchase price per credit (USD cents) for revenue-share payouts. */
    avgCreditValueCents: integer("avg_credit_value_cents").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("credit_accounts_holder_kind_idx").on(
      table.holder,
      table.classType,
      table.durationMinutes,
    ),
    check("credit_accounts_balance_non_negative", sql`${table.balance} >= 0`),
  ],
);

export type CreditReason = "purchase" | "grant" | "booking" | "refund" | "adjustment";

/** Every credit movement; the balance is the sum of `delta` per account. */
export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => creditAccounts.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason").$type<CreditReason>().notNull(),
    sessionId: text("session_id"),
    orderId: text("order_id"),
    actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("credit_transactions_account_idx").on(table.accountId, table.createdAt)],
);

/** pending: sent to Stripe Checkout, not paid yet. */
export type OrderStatus = "pending" | "paid" | "canceled" | "refunded";
export type OrderProvider = "demo" | "stripe" | "manual";

/** Package purchases. `demo` orders credit the package without charging. */
export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    buyerUserId: text("buyer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pairId: text("pair_id").references(() => studentPairs.id, { onDelete: "set null" }),
    packageId: text("package_id"),
    classType: text("class_type").$type<ClassType>().notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    credits: integer("credits").notNull(),
    totalCents: integer("total_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    provider: text("provider").$type<OrderProvider>().notNull(),
    providerRef: text("provider_ref"),
    status: text("status").$type<OrderStatus>().notNull().default("paid"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_buyer_idx").on(table.buyerUserId, table.createdAt),
    uniqueIndex("orders_provider_ref_idx").on(table.provider, table.providerRef),
  ],
);

/** Public teacher card shown when booking. */
export const teacherProfiles = pgTable("teacher_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  headline: text("headline").notNull().default(""),
  bio: text("bio").notNull().default(""),
  country: text("country").notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  /** Bookable by students. Off while a teacher is paused. */
  bookable: boolean("bookable").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  /** Stripe Connect account that receives payouts (sandbox until live keys). */
  stripeAccountId: text("stripe_account_id"),
  /** The account can receive transfers (onboarding finished). */
  stripeReady: boolean("stripe_ready").notNull().default(false),
});

/**
 * Weekly availability in the teacher's own time zone (`users.timezone`).
 * Minutes from local midnight; `weekday` 0 = Sunday.
 */
export const teacherAvailability = pgTable(
  "teacher_availability",
  {
    id: text("id").primaryKey(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    startMinute: smallint("start_minute").notNull(),
    endMinute: smallint("end_minute").notNull(),
  },
  (table) => [
    index("teacher_availability_teacher_idx").on(table.teacherId, table.weekday),
    check(
      "teacher_availability_range",
      sql`${table.weekday} BETWEEN 0 AND 6 AND ${table.startMinute} >= 0 AND ${table.endMinute} <= 1440 AND ${table.startMinute} < ${table.endMinute}`,
    ),
  ],
);

/**
 * One live class. A teacher can never have two scheduled classes that overlap:
 * the exclusion constraint `class_sessions_teacher_no_overlap` (custom
 * migration, needs btree_gist) rejects it even under concurrent bookings.
 */
export const classSessions = pgTable(
  "class_sessions",
  {
    id: text("id").primaryKey(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    classType: text("class_type").$type<ClassType>().notNull(),
    /** `trial` = demo lesson; student usually pays no credit; teacher paid at trial % in payout settings. */
    billingKind: text("billing_kind").$type<ClassBillingKind>().notNull().default("standard"),
    durationMinutes: integer("duration_minutes").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").$type<ClassSessionStatus>().notNull().default("scheduled"),
    pairId: text("pair_id").references(() => studentPairs.id, { onDelete: "set null" }),
    bookedByUserId: text("booked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Credit account charged for the booking (refunds go back here). */
    creditAccountId: text("credit_account_id").references(() => creditAccounts.id, {
      onDelete: "set null",
    }),
    /** Revenue attributed when booked (avg credit value on the account); null for legacy rows. */
    creditValueCents: integer("credit_value_cents"),
    topic: text("topic").notNull(),
    description: text("description").notNull().default(""),
    agenda: jsonb("agenda").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    outcomes: jsonb("outcomes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    materials: jsonb("materials")
      .$type<ClassSessionMaterial[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    materialIds: jsonb("material_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    assignmentIds: jsonb("assignment_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    recap: text("recap"),
    teacherNote: text("teacher_note"),
    homework: text("homework"),
    cancellation: jsonb("cancellation").$type<ClassCancellation>(),
    rescheduledFrom: timestamp("rescheduled_from", { withTimezone: true }),
    /** Classroom state: the teacher opened the call. */
    liveStartedAt: timestamp("live_started_at", { withTimezone: true }),
    liveStartedByUserId: text("live_started_by_user_id"),
    liveEndedAt: timestamp("live_ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("class_sessions_teacher_start_idx").on(table.teacherId, table.startsAt),
    index("class_sessions_start_idx").on(table.startsAt),
    check("class_sessions_time_order", sql`${table.startsAt} < ${table.endsAt}`),
  ],
);

/** Students in a class (one for one-on-one, both partners for paired). */
export const classParticipants = pgTable(
  "class_participants",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Set from LiveKit webhooks (or the first join when webhooks are off). */
    firstJoinedAt: timestamp("first_joined_at", { withTimezone: true }),
    lastJoinedAt: timestamp("last_joined_at", { withTimezone: true }),
    lastLeftAt: timestamp("last_left_at", { withTimezone: true }),
    secondsPresent: integer("seconds_present").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.userId] }),
    index("class_participants_user_idx").on(table.userId),
  ],
);

export type ChangeRequestStatus = "pending" | "accepted" | "declined" | "expired";

/** A paired-class reschedule waits for the partner (24 h, then it lapses). */
export const classChangeRequests = pgTable(
  "class_change_requests",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    requestedByUserId: text("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    newStartsAt: timestamp("new_starts_at", { withTimezone: true }).notNull(),
    status: text("status").$type<ChangeRequestStatus>().notNull().default("pending"),
    respondedByUserId: text("responded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("class_change_requests_one_pending_idx")
      .on(table.sessionId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export type WaitingStatus = "pending" | "approved" | "denied";

/** Classroom waiting room (when CLASS_WAITING_ROOM=true). */
export const classroomWaiting = pgTable(
  "classroom_waiting",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status").$type<WaitingStatus>().notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.userId] })],
);

export type RecordingSource = "egress" | "browser";
export type RecordingStorage = "b2" | "local";
export type RecordingStatus = "recording" | "uploading" | "ready" | "failed";

/** Class recordings: LiveKit egress files or teacher browser uploads. */
export const recordings = pgTable(
  "recordings",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    source: text("source").$type<RecordingSource>().notNull(),
    storage: text("storage").$type<RecordingStorage>().notNull(),
    objectKey: text("object_key"),
    fileName: text("file_name"),
    contentType: text("content_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    status: text("status").$type<RecordingStatus>().notNull(),
    egressId: text("egress_id"),
    /** "file" for recordings, "rtmp" for live streams (egress only). */
    egressKind: text("egress_kind").$type<"file" | "rtmp">(),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("recordings_session_idx").on(table.sessionId, table.createdAt),
    uniqueIndex("recordings_egress_idx").on(table.egressId),
  ],
);

/** In-class chat messages keyed by class session id (same id as the classroom route). */
export const classroomChatMessages = pgTable(
  "classroom_chat_messages",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    senderIdentity: text("sender_identity").notNull(),
    senderName: text("sender_name").notNull(),
    body: text("body").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("classroom_chat_messages_class_sent_idx").on(table.classId, table.sentAt)],
);

export type PricingClassType = ClassType;

/** Sellable class packages (admin catalog → public /pricing). Amounts in cents (USD). */
export const pricingPackages = pgTable(
  "pricing_packages",
  {
    id: text("id").primaryKey(),
    classType: text("class_type").$type<PricingClassType>().notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    credits: integer("credits").notNull(),
    name: text("name").notNull(),
    label: text("label").notNull(),
    description: text("description").notNull(),
    pricePerClassCents: integer("price_per_class_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    savingsPercent: integer("savings_percent").notNull().default(0),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("pricing_packages_variant_idx").on(
      table.classType,
      table.durationMinutes,
      table.credits,
    ),
    index("pricing_packages_active_sort_idx").on(table.active, table.sortOrder),
  ],
);

export type MaterialVisibility = "private" | "shared" | "global";
export type MaterialModeration = "none" | "pending" | "approved" | "rejected";
export type MaterialRowStatus = "draft" | "published" | "archived";

/**
 * Teaching library. Visibility: `private` (author only), `shared` (every
 * teacher and staff), `global` (students too). Global needs a manager's
 * approval: `moderation` goes pending → approved/rejected.
 */
export const materials = pgTable(
  "materials",
  {
    id: text("id").primaryKey(),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull(),
    description: text("description").notNull().default(""),
    level: text("level").notNull().default("all"),
    tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    href: text("href"),
    status: text("status").$type<MaterialRowStatus>().notNull().default("published"),
    visibility: text("visibility").$type<MaterialVisibility>().notNull().default("private"),
    moderation: text("moderation").$type<MaterialModeration>().notNull().default("none"),
    reviewNote: text("review_note"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("materials_author_idx").on(table.authorUserId),
    index("materials_visibility_idx").on(table.visibility, table.moderation),
  ],
);

export type ApplicationStatus = "submitted" | "approved" | "rejected" | "withdrawn";
export type TeacherApplicationTrack = "conversation" | "certified";
export type TeacherFluencyLevel = "native" | "c2" | "other";

export type TeacherApplicationCredential = {
  type: string;
  label: string;
  year?: number | null;
  url?: string | null;
};

/** In-platform academy mail (inbox in /apps/email + optional SMTP copy). */
export const academyMessages = pgTable(
  "academy_messages",
  {
    id: text("id").primaryKey(),
    senderUserId: text("sender_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    starredByRecipient: boolean("starred_by_recipient").notNull().default(false),
    importantByRecipient: boolean("important_by_recipient").notNull().default(false),
    senderTrashedAt: timestamp("sender_trashed_at", { withTimezone: true }),
    recipientTrashedAt: timestamp("recipient_trashed_at", { withTimezone: true }),
    externalDelivered: boolean("external_delivered").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("academy_messages_recipient_idx").on(table.recipientUserId, table.createdAt),
    index("academy_messages_sender_idx").on(table.senderUserId, table.createdAt),
  ],
);

export type ManagerInvitationStatus = "pending" | "accepted" | "revoked" | "expired";

/** Admin invites a future operations manager; they accept at /join/manager. */
export const managerInvitations = pgTable(
  "manager_invitations",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    token: text("token").notNull(),
    status: text("status").$type<ManagerInvitationStatus>().notNull().default("pending"),
    invitedByUserId: text("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
    inviteNote: text("invite_note").notNull().default(""),
    experienceNote: text("experience_note"),
    acceptedByUserId: text("accepted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("manager_invitations_token_idx").on(table.token),
    uniqueIndex("manager_invitations_open_email_idx")
      .on(sql`lower(${table.email})`)
      .where(sql`${table.status} = 'pending'`),
    index("manager_invitations_status_idx").on(table.status, table.createdAt),
  ],
);

/** "Teach with us": a student (or new account) applies; a manager decides. */
export const teacherApplications = pgTable(
  "teacher_applications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").$type<ApplicationStatus>().notNull().default("submitted"),
    track: text("track").$type<TeacherApplicationTrack>().notNull().default("conversation"),
    fluency: text("fluency").$type<TeacherFluencyLevel>().notNull().default("native"),
    fluencyNote: text("fluency_note").notNull().default(""),
    yearsTeaching: integer("years_teaching").notNull().default(0),
    taughtOnlineBefore: boolean("taught_online_before").notNull().default(false),
    credentials: jsonb("credentials")
      .$type<TeacherApplicationCredential[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    headline: text("headline").notNull(),
    bio: text("bio").notNull(),
    country: text("country").notNull().default(""),
    /** Languages the applicant teaches ("spanish", "english"). */
    teaches: jsonb("teaches").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    experience: text("experience").notNull().default(""),
    videoUrl: text("video_url"),
    reviewerUserId: text("reviewer_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("teacher_applications_one_open_idx")
      .on(table.userId)
      .where(sql`${table.status} = 'submitted'`),
    index("teacher_applications_status_idx").on(table.status, table.createdAt),
  ],
);

export type TeacherInvitationStatus = "pending" | "accepted" | "revoked" | "expired";

/** Manager or admin invites someone to submit a teacher application at /apply. */
export const teacherInvitations = pgTable(
  "teacher_invitations",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    status: text("status").$type<TeacherInvitationStatus>().notNull().default("pending"),
    invitedByUserId: text("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
    inviteNote: text("invite_note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedApplicationId: text("accepted_application_id").references(() => teacherApplications.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("teacher_invitations_open_email_idx")
      .on(sql`lower(${table.email})`)
      .where(sql`${table.status} = 'pending'`),
    index("teacher_invitations_status_idx").on(table.status, table.createdAt),
  ],
);

/** Checkout and teacher payout rails (single row, id = "default"). */
export const paymentProviderSettings = pgTable("payment_provider_settings", {
  id: text("id").primaryKey(),
  stripeCheckoutEnabled: boolean("stripe_checkout_enabled").notNull().default(true),
  stripePayoutEnabled: boolean("stripe_payout_enabled").notNull().default(true),
  manualPayoutEnabled: boolean("manual_payout_enabled").notNull().default(true),
  updatedByUserId: text("updated_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Teacher pay per delivered class (single row, id = "default"). */
export const payoutSettings = pgTable("payout_settings", {
  id: text("id").primaryKey(),
  /** Legacy fixed rates (unused; kept for existing DB rows). */
  rate25Cents: integer("rate_25_cents").notNull().default(800),
  rate50Cents: integer("rate_50_cents").notNull().default(1_400),
  pairedPercent: integer("paired_percent").notNull().default(140),
  platformTakeLevel1: integer("platform_take_level_1").notNull().default(25),
  platformTakeLevel2: integer("platform_take_level_2").notNull().default(20),
  platformTakeLevel3: integer("platform_take_level_3").notNull().default(15),
  platformTakeLevel4: integer("platform_take_level_4").notNull().default(10),
  /** Trial/demo classes pay this percentage of the normal calculated payout (e.g. 50). */
  trialPercent: integer("trial_percent").notNull().default(50),
  trialReference25Cents: integer("trial_reference_25_cents").notNull().default(1_600),
  trialReference50Cents: integer("trial_reference_50_cents").notNull().default(2_300),
  updatedByUserId: text("updated_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row per delivered class: what the teacher earned and when it was paid. */
export const teacherEarnings = pgTable(
  "teacher_earnings",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    classType: text("class_type").$type<ClassType>().notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    baseCents: integer("base_cents").notNull(),
    /** Teacher share % of credit value at delivery (e.g. 75 when platform take is 25). */
    levelPercent: integer("level_percent").notNull(),
    level: integer("level").notNull(),
    amountCents: integer("amount_cents").notNull(),
    classEndedAt: timestamp("class_ended_at", { withTimezone: true }).notNull(),
    payoutBatchId: text("payout_batch_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("teacher_earnings_session_idx").on(table.sessionId),
    index("teacher_earnings_teacher_idx").on(table.teacherId, table.classEndedAt),
    index("teacher_earnings_batch_idx").on(table.payoutBatchId),
  ],
);

export type PayoutBatchStatus = "awaiting_approval" | "approved" | "paid" | "rejected";
export type PayoutBatchInitiator = "manager" | "teacher";

/** Unpaid earnings grouped for approval — by calendar month (manager) or one teacher (self-request). */
export const payoutBatches = pgTable(
  "payout_batches",
  {
    id: text("id").primaryKey(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    status: text("status").$type<PayoutBatchStatus>().notNull().default("awaiting_approval"),
    initiatedBy: text("initiated_by").$type<PayoutBatchInitiator>().notNull().default("manager"),
    totalCents: integer("total_cents").notNull(),
    teacherCount: integer("teacher_count").notNull(),
    classCount: integer("class_count").notNull(),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedByUserId: text("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidReference: text("paid_reference"),
    rejectedReason: text("rejected_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("payout_batches_status_idx").on(table.status, table.createdAt)],
);

/** A student's rating of a class they took (1–5 stars). */
export const classRatings = pgTable(
  "class_ratings",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stars: smallint("stars").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.studentId] }),
    index("class_ratings_teacher_idx").on(table.teacherId),
    check("class_ratings_stars", sql`${table.stars} BETWEEN 1 AND 5`),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type PricingPackageRow = typeof pricingPackages.$inferSelect;
export type NewPricingPackageRow = typeof pricingPackages.$inferInsert;
export type ClassSessionRow = typeof classSessions.$inferSelect;
export type RecordingRow = typeof recordings.$inferSelect;
export type MaterialRow = typeof materials.$inferSelect;
export type TeacherApplicationRow = typeof teacherApplications.$inferSelect;
export type PayoutBatchRow = typeof payoutBatches.$inferSelect;


/** One Stripe transfer per teacher of a payout batch (idempotent per pair). */
export const payoutTransfers = pgTable(
  "payout_transfers",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => payoutBatches.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    stripeAccountId: text("stripe_account_id").notNull(),
    stripeTransferId: text("stripe_transfer_id"),
    status: text("status").$type<"paid" | "failed">().notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("payout_transfers_batch_teacher_idx").on(table.batchId, table.teacherId)],
);

/**
 * Private calendar subscription (.ics) per user. Only a hash of the token is
 * stored; resetting the link replaces it, so an old URL stops working.
 */
export const calendarFeeds = pgTable("calendar_feeds", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});
