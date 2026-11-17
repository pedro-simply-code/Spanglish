import { connection } from "next/server";
import { and, count, desc, eq, gt, gte, isNotNull, ne, sql } from "drizzle-orm";
import type {
  AdminAlert,
  AdminStat,
  EmailHealthRow,
  LedgerSnapshot,
  ManagerAccount,
  ManagerDashboardStat,
  PayoutBatch,
  TeacherRateTier,
} from "@/features/admin";
import { env } from "@/env";
import { roleCodes, type RoleCode } from "@/lib/auth-roles";
import { listAuditEvents, type AuditListEntry } from "@/server/audit/audit-log";
import { googleSignInEnabled } from "@/server/auth/auth";
import { stripeEnabled, stripeTestMode, stripeWebhookEnabled } from "@/server/payments/stripe";
import { db } from "@/server/db";
import { auditLogs, sessions, users } from "@/server/db/schema";
import type { Integration, IntegrationStatus, PersonAccount } from "@/features/management";
import {
  economicsToAdminStats,
  economicsToLedgerSnapshots,
  economicsToManagerStats,
  economicsToPayoutBatches,
  getAcademyEconomicsSnapshot,
} from "@/server/admin/class-economics";
import {
  countPricingPackages,
  listCommercePackagesFromDb,
  listPricingPackageRows,
  rowToAdminPackageDetail,
  rowToCommercePackage,
} from "@/server/pricing/packages";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  roles: RoleCode[];
  status: "Active" | "Invited" | "Suspended";
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
};

function formatInt(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function integrationStatus(ready: boolean, partial: boolean): IntegrationStatus {
  if (ready) return "connected";
  if (partial) return "action-needed";
  return "not-configured";
}

export function buildIntegrationStatuses(): Integration[] {
  const liveKitReady = Boolean(
    env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET,
  );
  const liveKitPartial = Boolean(
    env.LIVEKIT_URL || env.LIVEKIT_API_KEY || env.LIVEKIT_API_SECRET,
  );

  const emailReady =
    Boolean(env.EMAIL_FROM) &&
    (env.EMAIL_PROVIDER === "postmark"
      ? Boolean(env.POSTMARK_SERVER_TOKEN)
      : Boolean(env.SMTP_USER && env.SMTP_PASS));
  const emailPartial = Boolean(env.EMAIL_FROM || env.SMTP_USER || env.POSTMARK_SERVER_TOKEN);

  const b2Ready =
    env.RECORDING_STORAGE === "cloud" &&
    Boolean(env.B2_KEY_ID && env.B2_APPLICATION_KEY && env.B2_BUCKET_NAME && env.B2_S3_ENDPOINT);
  const b2Partial = Boolean(env.B2_KEY_ID || env.B2_BUCKET_NAME);

  const v = (name: string, value: unknown, optional = false) => ({ name, set: Boolean(value), optional });

  return [
    {
      id: "integration-meet",
      name: "LiveKit",
      description: `Meeting provider: ${env.MEETING_PROVIDER}. Keys: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.`,
      status: integrationStatus(liveKitReady, liveKitPartial),
      owner: "Platform",
      variables: [
        v("LIVEKIT_URL", env.LIVEKIT_URL),
        v("LIVEKIT_API_KEY", env.LIVEKIT_API_KEY),
        v("LIVEKIT_API_SECRET", env.LIVEKIT_API_SECRET),
      ],
      docsUrl: "https://docs.livekit.io/home/get-started/intro-to-livekit/",
    },
    {
      id: "integration-email",
      name: env.EMAIL_PROVIDER === "postmark" ? "Postmark" : "Gmail SMTP",
      description: "Verification codes, password reset, and security notices.",
      status: integrationStatus(emailReady, emailPartial),
      owner: "Platform",
      variables:
        env.EMAIL_PROVIDER === "postmark"
          ? [v("EMAIL_FROM", env.EMAIL_FROM), v("POSTMARK_SERVER_TOKEN", env.POSTMARK_SERVER_TOKEN)]
          : [v("EMAIL_FROM", env.EMAIL_FROM), v("SMTP_USER", env.SMTP_USER), v("SMTP_PASS", env.SMTP_PASS)],
      docsUrl:
        env.EMAIL_PROVIDER === "postmark"
          ? "https://postmarkapp.com/developer"
          : "https://support.google.com/accounts/answer/185833",
    },
    {
      id: "integration-google",
      name: "Google sign-in",
      description: "OAuth client for web (and Android client when configured).",
      status: googleSignInEnabled ? "connected" : "not-configured",
      owner: "Platform",
      variables: [
        v("GOOGLE_CLIENT_ID", env.GOOGLE_CLIENT_ID),
        v("GOOGLE_CLIENT_SECRET", env.GOOGLE_CLIENT_SECRET),
        v("GOOGLE_ANDROID_CLIENT_ID", env.GOOGLE_ANDROID_CLIENT_ID, true),
      ],
      docsUrl: "https://console.cloud.google.com/apis/credentials",
    },
    {
      id: "integration-storage",
      name: env.RECORDING_STORAGE === "cloud" ? "Backblaze B2" : "Local recordings",
      description:
        env.RECORDING_STORAGE === "cloud"
          ? "Class recordings in B2 (B2_* variables)."
          : "Files under storage/recordings until RECORDING_STORAGE=cloud.",
      status:
        env.RECORDING_STORAGE === "local"
          ? "connected"
          : integrationStatus(b2Ready, b2Partial),
      owner: "Platform",
      variables:
        env.RECORDING_STORAGE === "cloud"
          ? [
              v("B2_KEY_ID", env.B2_KEY_ID),
              v("B2_APPLICATION_KEY", env.B2_APPLICATION_KEY),
              v("B2_BUCKET_NAME", env.B2_BUCKET_NAME),
              v("B2_S3_ENDPOINT", env.B2_S3_ENDPOINT),
            ]
          : [v("RECORDING_STORAGE=cloud", false, true)],
      docsUrl: "https://www.backblaze.com/docs/cloud-storage-s3-compatible-api",
    },
    {
      id: "integration-billing",
      name: stripeTestMode ? "Stripe (test mode)" : "Stripe",
      description:
        "Package checkout (Stripe Checkout) and teacher payouts (Connect transfers). Webhook: /api/webhooks/stripe.",
      status: stripeWebhookEnabled ? "connected" : stripeEnabled || env.STRIPE_SECRET_KEY ? "action-needed" : "not-configured",
      owner: "Finance",
      variables: [
        v("STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY),
        v("STRIPE_WEBHOOK_SECRET", env.STRIPE_WEBHOOK_SECRET),
        v("STRIPE_CONNECT_COUNTRY", env.STRIPE_CONNECT_COUNTRY, true),
      ],
      docsUrl: "https://dashboard.stripe.com/test/apikeys",
    },
  ];
}

export async function listCommercePackagesPaginated(options: {
  offset: number;
  limit: number;
  activeOnly?: boolean;
}) {
  const rows = await listPricingPackageRows({
    offset: options.offset,
    limit: options.limit,
    activeOnly: options.activeOnly,
  });
  return rows.map(rowToCommercePackage);
}

export async function listAdminPackageDetailsPaginated(options: {
  offset: number;
  limit: number;
  classType?: "one-on-one" | "paired";
}) {
  const rows = await listPricingPackageRows({
    offset: options.offset,
    limit: options.limit,
    classType: options.classType,
  });
  return rows.map(rowToAdminPackageDetail);
}

export async function countCommercePackages(
  activeOnly?: boolean,
  classType?: "one-on-one" | "paired",
) {
  return countPricingPackages({ activeOnly, classType });
}

/** All packages for admin publish view (unpaginated). */
export async function listAllCommercePackages() {
  return listCommercePackagesFromDb();
}

export async function countUsersByRole(): Promise<Record<RoleCode, number>> {
  const counts = Object.fromEntries(roleCodes.map((role) => [role, 0])) as Record<
    RoleCode,
    number
  >;

  for (const role of roleCodes) {
    const [row] = await db
      .select({ value: count() })
      .from(users)
      .where(sql`${role} = ANY(${users.roles})`);
    counts[role] = row?.value ?? 0;
  }

  return counts;
}

export function toPersonAccounts(rows: AdminUserRow[]): PersonAccount[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    roles: row.roles,
    status: row.status,
    twoFactorEnabled: row.twoFactorEnabled,
    createdAt: row.createdAt,
  }));
}

export type AdminUserListFilter = {
  role?: RoleCode;
  /** Case-insensitive match on name or email. */
  search?: string;
};

function sanitizeUserSearch(input: string) {
  return input.trim().replace(/[%_\\]/g, "").slice(0, 80);
}

function userListWhere(filter: AdminUserListFilter) {
  const clauses = [];
  if (filter.role) {
    clauses.push(sql`${filter.role} = ANY(${users.roles})`);
  }
  const search = filter.search ? sanitizeUserSearch(filter.search) : "";
  if (search) {
    const pattern = `%${search}%`;
    clauses.push(sql`(${users.name} ILIKE ${pattern} OR ${users.email} ILIKE ${pattern})`);
  }
  return clauses.length ? and(...clauses) : undefined;
}

export async function countAllUsers() {
  const [row] = await db.select({ value: count() }).from(users);
  return row?.value ?? 0;
}

export async function countUsersForAdmin(filter: AdminUserListFilter = {}) {
  const where = userListWhere(filter);
  const base = db.select({ value: count() }).from(users);
  const [row] = where ? await base.where(where) : await base;
  return row?.value ?? 0;
}

export async function listUsersForAdmin(options: {
  offset: number;
  limit: number;
  role?: RoleCode;
  search?: string;
}): Promise<AdminUserRow[]> {
  const where = userListWhere({ role: options.role, search: options.search });
  const base = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      roles: users.roles,
      emailVerified: users.emailVerified,
      twoFactorEnabled: users.twoFactorEnabled,
      emailBouncedAt: users.emailBouncedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .offset(options.offset)
    .limit(options.limit);
  const rows = where ? await base.where(where) : await base;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    roles: row.roles,
    emailVerified: row.emailVerified,
    twoFactorEnabled: Boolean(row.twoFactorEnabled),
    createdAt: row.createdAt.toISOString(),
    status: row.emailBouncedAt
      ? "Suspended"
      : row.emailVerified
        ? "Active"
        : "Invited",
  }));
}

export async function listManagers(): Promise<ManagerAccount[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailBouncedAt: users.emailBouncedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`'manager' = ANY(${users.roles})`)
    .orderBy(desc(users.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.emailBouncedAt ? "Suspended" : "Active",
    since: row.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
  }));
}

export async function buildTeacherRateTiers(): Promise<TeacherRateTier[]> {
  const groups = await countTeachersByLevel();
  return groups.map((group, index) => ({
    id: `level-${index}`,
    label: group.level,
    multiplier: 1,
    description: "Teachers in the database at this learning level.",
    teachers: group.teachers,
  }));
}

async function countTeachersByLevel(): Promise<{ level: string; teachers: number }[]> {
  const rows = await db
    .select({
      level: users.level,
      value: count(),
    })
    .from(users)
    .where(sql`'teacher' = ANY(${users.roles})`)
    .groupBy(users.level);

  const labels: Record<string, string> = {
    beginner: "Beginner cohort",
    intermediate: "Intermediate cohort",
    advanced: "Advanced cohort",
  };

  return rows.map((row) => ({
    level: row.level ? (labels[row.level] ?? row.level) : "Level not set",
    teachers: row.value,
  }));
}

async function countTable(table: typeof users | typeof sessions) {
  const [row] = await db.select({ value: count() }).from(table);
  return row?.value ?? 0;
}

export async function getLedgerSnapshots(): Promise<LedgerSnapshot[]> {
  const snapshot = await getAcademyEconomicsSnapshot();
  return economicsToLedgerSnapshots(snapshot);
}

export async function getOperationsStats(): Promise<AdminStat[]> {
  const snapshot = await getAcademyEconomicsSnapshot();
  return economicsToAdminStats(snapshot);
}

export async function getManagerDashboardStats(): Promise<ManagerDashboardStat[]> {
  const [snapshot, roles] = await Promise.all([
    getAcademyEconomicsSnapshot(),
    countUsersByRole(),
  ]);
  return economicsToManagerStats(snapshot, roles.student, roles.teacher);
}

export async function getAcademyEconomicsForDashboard() {
  return getAcademyEconomicsSnapshot();
}

export async function getEstimatedPayoutBatches(): Promise<PayoutBatch[]> {
  const snapshot = await getAcademyEconomicsSnapshot();
  return economicsToPayoutBatches(snapshot);
}

export async function getEmailHealthRows(): Promise<EmailHealthRow[]> {
  await connection(); // live data, read the clock at request time
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, verified, bounced, recentSignIns] = await Promise.all([
    countTable(users),
    db
      .select({ value: count() })
      .from(users)
      .where(eq(users.emailVerified, true))
      .then((rows) => rows[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(users)
      .where(isNotNull(users.emailBouncedAt))
      .then((rows) => rows[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(auditLogs)
      .where(
        and(eq(auditLogs.action, "auth.sign_in"), gte(auditLogs.createdAt, weekAgo)),
      )
      .then((rows) => rows[0]?.value ?? 0),
  ]);

  const emailConfigured =
    Boolean(env.EMAIL_FROM) &&
    (env.EMAIL_PROVIDER === "postmark"
      ? Boolean(env.POSTMARK_SERVER_TOKEN)
      : Boolean(env.SMTP_USER && env.SMTP_PASS));

  const webhookOk =
    env.EMAIL_PROVIDER !== "postmark" || Boolean(env.POSTMARK_WEBHOOK_SECRET);

  return [
    {
      id: "accounts",
      metric: "Accounts with email",
      value: formatInt(totalUsers),
      status: "ok",
    },
    {
      id: "verified",
      metric: "Verified inboxes",
      value: `${formatInt(verified)} (${totalUsers ? Math.round((verified / totalUsers) * 100) : 0}%)`,
      status: verified === totalUsers ? "ok" : "watch",
    },
    {
      id: "bounced",
      metric: "Bounced addresses",
      value: formatInt(bounced),
      status: bounced === 0 ? "ok" : "action",
    },
    {
      id: "signins",
      metric: "Sign-ins (7 days)",
      value: formatInt(recentSignIns),
      status: "ok",
    },
    {
      id: "delivery",
      metric: "Email delivery configured",
      value: emailConfigured ? "Yes" : "No",
      status: emailConfigured ? "ok" : "action",
    },
    {
      id: "webhook",
      metric: "Postmark bounce webhook",
      value: webhookOk ? "Configured" : "Missing secret",
      status: webhookOk ? "ok" : env.EMAIL_PROVIDER === "postmark" ? "action" : "watch",
    },
  ];
}

export async function getExecutiveStats(): Promise<AdminStat[]> {
  const integrations = buildIntegrationStatuses();
  const connected = integrations.filter((item) => item.status === "connected").length;

  await connection(); // live data, read the clock at request time
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeSessions, securityAlerts] = await Promise.all([
    countTable(users),
    db
      .select({ value: count() })
      .from(sessions)
      .where(gt(sessions.expiresAt, new Date()))
      .then((rows) => rows[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.createdAt, weekAgo),
          ne(auditLogs.severity, "info"),
        ),
      )
      .then((rows) => rows[0]?.value ?? 0),
  ]);

  return [
    {
      id: "accounts",
      label: "Total accounts",
      value: formatInt(totalUsers),
      helper: "Rows in users",
      href: "/admin/organization/users",
    },
    {
      id: "sessions",
      label: "Active sessions",
      value: formatInt(activeSessions),
      helper: "Current sign-ins",
      href: "/admin/organization/users",
    },
    {
      id: "security",
      label: "Security alerts (7d)",
      value: formatInt(securityAlerts),
      helper: "Warning or critical audit events",
      href: "/admin/audit",
    },
    {
      id: "integrations",
      label: "Integrations healthy",
      value: `${connected} / ${integrations.length}`,
      helper: "From environment configuration",
      href: "/admin/platform/integrations",
    },
  ];
}

export async function getPlatformHealthAlerts(): Promise<AdminAlert[]> {
  const alerts: AdminAlert[] = [];

  const integrations = buildIntegrationStatuses();
  for (const item of integrations.filter((row) => row.status !== "connected")) {
    alerts.push({
      id: `integration-${item.id}`,
      title: `${item.name} not ready`,
      detail: item.description,
      severity: item.status === "not-configured" ? "warning" : "info",
      href: "/admin/platform/integrations",
    });
  }

  const managersWithout2Fa = await db
    .select({ value: count() })
    .from(users)
    .where(
      and(
        sql`'manager' = ANY(${users.roles})`,
        sql`COALESCE(${users.twoFactorEnabled}, false) = false`,
      ),
    )
    .then((rows) => rows[0]?.value ?? 0);

  if (managersWithout2Fa > 0) {
    alerts.push({
      id: "manager-2fa",
      title: `${managersWithout2Fa} manager account(s) without 2FA`,
      detail: "Enable authenticator apps before handling payouts or role changes.",
      severity: "warning",
      href: "/admin/platform/security",
    });
  }

  const bounced = await db
    .select({ value: count() })
    .from(users)
    .where(isNotNull(users.emailBouncedAt))
    .then((rows) => rows[0]?.value ?? 0);

  if (bounced > 0) {
    alerts.push({
      id: "email-bounce",
      title: `${bounced} account(s) with bounced email`,
      detail: "Transactional mail is suppressed for these addresses.",
      severity: "warning",
      href: "/admin/platform/email",
    });
  }

  if (!env.EMAIL_FROM) {
    alerts.push({
      id: "email-from",
      title: "EMAIL_FROM is not set",
      detail: "Auth codes and security emails cannot send until from-address is configured.",
      severity: "critical",
      href: "/admin/platform/email",
    });
  }

  if (env.NODE_ENV === "production" && env.CLASS_RELAX_JOIN_WINDOW) {
    alerts.push({
      id: "join-window",
      title: "CLASS_RELAX_JOIN_WINDOW is on",
      detail: "Anyone can join classes outside the scheduled window in production.",
      severity: "critical",
      href: "/admin/platform/rooms",
    });
  }

  return alerts.slice(0, 8);
}

export async function getRecentAuditForDashboard(limit = 6): Promise<AuditListEntry[]> {
  return listAuditEvents({ limit });
}

export function formatAuditActivity(entry: AuditListEntry) {
  const when = new Date(entry.createdAt);
  const at = when.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const actor = entry.actorName || entry.actorEmail || "Unknown account";
  return {
    id: entry.id,
    actor,
    action: entry.action,
    at,
    severity: entry.severity,
  };
}